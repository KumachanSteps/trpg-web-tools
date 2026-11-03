/* KPレス・ジュークボックスメーカー — ココフォリアのルームデータ（ZIP）の読み書き
 *
 * ルームZIPの中身（コミュニティの解析と既存ツールから確認できた範囲）
 *   __data.json  { meta: { version: '1.1.0' }, entities: { room, items, decks, characters, effects, scenes }, resources: { '<sha256>.png': { type } } }
 *   .token       '0.' + sha256(__data.json のバイト列)
 *   <sha256>.<ext>  画像・音声。ファイル名はバイト列の SHA-256
 *
 * クリックアクション（clickAction）の中身は公開資料が見つからなかったため、
 * 既定の形は推測。ココフォリアから書き出したZIPを読み込むと、その中のクリックアクションから
 * 形を覚えて（learnShape）以後の書き出しに使う。 */
(function (global) {
  'use strict';

  const DATA_FILE = '__data.json';
  const TOKEN_FILE = '.token';
  const SHAPE_KEY = 'ccfoliaJukebox.clickActionShape';

  // 推測の既定形: { type: 'message', text: '<送信する文字>' }
  const DEFAULT_SHAPE = { kind: 'object', typeKey: 'type', typeValue: 'message', textKey: 'text', extra: {}, learned: false };

  let shape = loadShape();

  function loadShape() {
    try {
      const saved = JSON.parse(localStorage.getItem(SHAPE_KEY) || 'null');
      if (saved && saved.kind) return saved;
    } catch (error) { /* noop */ }
    return { ...DEFAULT_SHAPE };
  }

  function saveShape(next) {
    shape = next;
    try { localStorage.setItem(SHAPE_KEY, JSON.stringify(next)); } catch (error) { /* noop */ }
  }

  function resetShape() {
    shape = { ...DEFAULT_SHAPE };
    try { localStorage.removeItem(SHAPE_KEY); } catch (error) { /* noop */ }
  }

  /* ---------- クリックアクション ---------- */

  // 読み込んだ clickAction から送信テキストを取り出す
  function readClickAction(value) {
    if (value === null || value === undefined || value === '' || value === 'none') return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      const preferred = ['text', 'message', 'value', 'command', 'body', 'content'];
      for (const key of preferred) if (typeof value[key] === 'string') return value[key];
      for (const [key, v] of Object.entries(value)) {
        if (key === 'type' || key === 'kind' || key === 'action') continue;
        if (typeof v === 'string' && v) return v;
      }
    }
    return '';
  }

  // 実際のデータから形を覚える。覚えたら true
  function learnShape(value) {
    if (!value || typeof value !== 'object') return false;
    const text = readClickAction(value);
    if (!text) return false;
    let textKey = '';
    let typeKey = '';
    const extra = {};
    for (const [key, v] of Object.entries(value)) {
      if (!textKey && v === text) { textKey = key; continue; }
      if (!typeKey && typeof v === 'string' && /^(type|kind|action|mode)$/i.test(key)) { typeKey = key; continue; }
      extra[key] = v;
    }
    if (!textKey) return false;
    // このツール自身の推測の形と同じなら、確認できたことにはしない
    const sameAsGuess = typeKey === DEFAULT_SHAPE.typeKey && value[typeKey] === DEFAULT_SHAPE.typeValue && textKey === DEFAULT_SHAPE.textKey && !Object.keys(extra).length;
    if (sameAsGuess) return false;
    saveShape({ kind: 'object', typeKey, typeValue: typeKey ? value[typeKey] : '', textKey, extra, learned: true });
    return true;
  }

  function buildClickAction(text) {
    const message = String(text || '').trim();
    if (!message) return null;
    const out = { ...(shape.extra || {}) };
    if (shape.typeKey) out[shape.typeKey] = shape.typeValue;
    out[shape.textKey || 'text'] = message;
    return out;
  }

  // 「/scene 名前」を行ごとに拾う
  function sceneTargets(text) {
    const out = [];
    String(text || '').split(/\r?\n/).forEach(line => {
      const m = line.trim().match(/^\/scene\s+(.+)$/i);
      if (m) out.push(m[1].trim());
    });
    return out;
  }

  /* ---------- ハッシュとID ---------- */

  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  function firestoreId() {
    const buf = new Uint8Array(20);
    crypto.getRandomValues(buf);
    return Array.from(buf, b => ID_CHARS[b % ID_CHARS.length]).join('');
  }

  // マーカーのキーは16進のタイムスタンプ風（例: 19c61886089）
  let markerSeq = 0;
  function markerKey() {
    markerSeq += 1;
    return (Date.now() + markerSeq).toString(16) + markerSeq.toString(16).padStart(2, '0');
  }

  const EXT_BY_TYPE = {
    'image/png': 'png', 'image/jpeg': 'jpeg', 'image/gif': 'gif', 'image/webp': 'webp',
    'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mp4': 'm4a', 'audio/aac': 'aac'
  };
  const TYPE_BY_EXT = Object.fromEntries(Object.entries(EXT_BY_TYPE).map(([type, ext]) => [ext, type]));
  TYPE_BY_EXT.jpg = 'image/jpeg';

  function typeOfName(name) {
    const ext = String(name || '').split('.').pop().toLowerCase();
    return TYPE_BY_EXT[ext] || '';
  }

  /* ---------- 書き出し ---------- */

  /* room = {
   *   name, fieldWidth, fieldHeight, gridSize,
   *   background: Asset|null,
   *   startSceneIndex,
   *   scenes: [{ name, text, background: Asset|null, sound: { name, url, asset, volume, repeat } | null,
   *              markers: [{ x, y, z, width, height, text, image: Asset, action }] }]
   * }
   * Asset = { blob, type }
   */
  async function buildRoomZip(room) {
    if (typeof JSZip === 'undefined') throw new Error('jszip');
    const zip = new JSZip();
    const resources = {};
    const cache = new Map();

    async function addAsset(asset) {
      if (!asset || !asset.blob) return null;
      if (cache.has(asset.blob)) return cache.get(asset.blob);
      const bytes = new Uint8Array(await asset.blob.arrayBuffer());
      const type = asset.type || asset.blob.type || 'image/png';
      const name = `${await sha256Hex(bytes)}.${EXT_BY_TYPE[type] || 'png'}`;
      if (!resources[name]) {
        resources[name] = { type };
        zip.file(name, bytes);
      }
      cache.set(asset.blob, name);
      return name;
    }

    const now = Date.now();
    const scenes = {};
    const builtScenes = [];
    for (let i = 0; i < room.scenes.length; i += 1) {
      const scene = room.scenes[i];
      const markers = {};
      for (const marker of scene.markers) {
        markers[markerKey()] = {
          x: marker.x,
          y: marker.y,
          z: marker.z || 50,
          width: marker.width,
          height: marker.height,
          locked: true,
          freezed: true,
          text: marker.text || '',
          imageUrl: await addAsset(marker.image),
          clickAction: buildClickAction(marker.action)
        };
      }
      const bg = await addAsset(scene.background || room.background);
      const sound = scene.sound || null;
      const soundFile = sound && sound.asset ? await addAsset(sound.asset) : null;
      const data = {
        name: scene.name,
        backgroundUrl: bg,
        foregroundUrl: null,
        fieldObjectFit: 'fill',
        fieldWidth: room.fieldWidth,
        fieldHeight: room.fieldHeight,
        displayGrid: false,
        gridSize: room.gridSize || 1,
        markers,
        text: scene.text || '',
        soundUrl: soundFile || (sound && sound.url) || null,
        soundName: sound && (sound.url || soundFile) ? (sound.name || scene.name) : null,
        soundRef: null,
        soundVolume: sound && typeof sound.volume === 'number' ? sound.volume : 0.5,
        soundRepeat: sound ? sound.repeat !== false : true,
        mediaUrl: null,
        mediaName: null,
        mediaRef: null,
        mediaVolume: 0.5,
        mediaRepeat: true,
        mediaType: null,
        locked: false,
        order: i,
        createdAt: now + i,
        updatedAt: now + i
      };
      scenes[firestoreId()] = data;
      builtScenes.push(data);
    }

    const start = builtScenes[room.startSceneIndex || 0] || builtScenes[0];
    const roomEntity = {
      name: room.name || '',
      backgroundUrl: start ? start.backgroundUrl : null,
      foregroundUrl: null,
      fieldObjectFit: 'fill',
      fieldWidth: room.fieldWidth,
      fieldHeight: room.fieldHeight,
      displayGrid: false,
      gridSize: room.gridSize || 1,
      markers: start ? JSON.parse(JSON.stringify(start.markers)) : {},
      soundUrl: start ? start.soundUrl : null,
      soundName: start ? start.soundName : null,
      soundVolume: start ? start.soundVolume : 0.5,
      soundRepeat: true,
      messageChannels: []
    };

    const data = {
      meta: { version: '1.1.0' },
      entities: { room: roomEntity, items: {}, decks: {}, characters: {}, effects: {}, scenes },
      resources
    };
    return finishZip(zip, data);
  }

  async function finishZip(zip, data) {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    zip.file(DATA_FILE, bytes);
    zip.file(TOKEN_FILE, `0.${await sha256Hex(bytes)}`);
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }

  /* ---------- 読み込み ---------- */

  // 戻り値: { data, zip, files: Map<name, Blob>, learned }
  async function readRoomZip(file) {
    if (typeof JSZip === 'undefined') throw new Error('jszip');
    const zip = await JSZip.loadAsync(file);
    const entry = zip.file(DATA_FILE);
    if (!entry) throw new Error('nodata');
    const data = JSON.parse(await entry.async('string'));
    if (!data || !data.entities) throw new Error('nodata');
    const files = new Map();
    const names = Object.keys(zip.files).filter(name => !zip.files[name].dir && name !== DATA_FILE && name !== TOKEN_FILE);
    for (const name of names) {
      const type = (data.resources && data.resources[name] && data.resources[name].type) || typeOfName(name);
      const buf = await zip.file(name).async('arraybuffer');
      files.set(name, new Blob([buf], { type }));
    }
    let learned = false;
    const tryLearn = value => { if (!learned && value && typeof value === 'object') learned = learnShape(value); };
    const ents = data.entities;
    Object.values(ents.scenes || {}).forEach(scene => Object.values(scene.markers || {}).forEach(m => tryLearn(m.clickAction)));
    Object.values((ents.room && ents.room.markers) || {}).forEach(m => tryLearn(m.clickAction));
    Object.values(ents.items || {}).forEach(item => tryLearn(item.clickAction));
    return { data, files, learned };
  }

  // 読み込んだデータのクリックアクションだけを書き換えて、元のファイルと一緒にZIPへ戻す
  async function rebuildImportedZip(data, files) {
    const zip = new JSZip();
    files.forEach((blob, name) => zip.file(name, blob));
    return finishZip(zip, data);
  }

  global.Ccfolia = {
    readClickAction,
    buildClickAction,
    sceneTargets,
    learnShape,
    resetShape,
    getShape: () => shape,
    buildRoomZip,
    readRoomZip,
    rebuildImportedZip,
    typeOfName
  };
})(window);
