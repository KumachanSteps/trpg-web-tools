/* ============================================================
   Chara Libra -> 星図 自動読込
   Chara Libra側の追加操作は不要。星図ページ側から、同一オリジンの
   localStorage / IndexedDB を読み取り、キャラクター候補を抽出する。

   v1.6:
   - 同一探索者を名前ベースで統合し、保存領域内の重複表示を防止
   - 「引退 / retired」ステータスを表示対象から除外
   - 更新日時の新しい順に表示
   - オブジェクト型タグの [object Object] 表示を防止
   ============================================================ */
(() => {
  const grid = document.getElementById('character-grid');
  const previewGrid = document.getElementById('character-preview-list');
  const statusEl = document.getElementById('character-load-status');
  const filterRow = document.getElementById('character-filters');
  const refreshBtn = document.getElementById('character-refresh');
  if (!grid && !previewGrid) return;

  const state = {
    sourceCharacters: [],
    characters: [],
    filter: 'all',
    stats: { candidates: 0, duplicates: 0, retired: 0 },
    localCount: 0,
    publishedCount: 0
  };

  const CHARA_LIBRA_STORAGE_KEY = 'trpg-chara-libra-v1';
  const PUBLISHED_CHARACTER_URL = 'data/characters.json';

  const isPrimitive = (value) => ['string', 'number', 'boolean'].includes(typeof value);

  function text(value) {
    if (value == null) return '';
    if (isPrimitive(value)) return String(value).trim();
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
    if (Array.isArray(value)) {
      return value.map(item => text(item)).filter(Boolean).join('、');
    }
    if (typeof value === 'object') {
      const preferredKeys = ['label', 'name', 'title', 'text', 'value', 'status', 'displayName'];
      for (const key of preferredKeys) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const result = text(value[key]);
          if (result && result !== '[object Object]') return result;
        }
      }
      return '';
    }
    return '';
  }

  const first = (...values) => values.map(text).find(Boolean) || '';
  const escapeHtml = (value) => text(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function getNestedRaw(obj, paths) {
    for (const path of paths) {
      let value = obj;
      for (const key of path.split('.')) {
        value = value && typeof value === 'object' ? value[key] : undefined;
      }
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  }

  function getNested(obj, paths) {
    const value = getNestedRaw(obj, paths);
    return text(value);
  }

  function splitNameAndReading(value) {
    const source = text(value);
    const match = source.match(/^(.*?)[\s　]*[（(]([ぁ-ゖァ-ヺー・･\s　]+)[）)]\s*$/u);
    return match
      ? { name: match[1].trim(), reading: match[2].trim() }
      : { name: source, reading: '' };
  }

  function charScore(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
    const data = raw.data && typeof raw.data === 'object' ? raw.data : raw;
    const name = first(data.name, data.characterName, data.character_name, raw.name);
    if (!name) return 0;
    let score = 2;
    const keys = new Set([...Object.keys(raw), ...Object.keys(data)].map(k => k.toLowerCase()));
    ['system','status','occupation','job','memo','commands','params','skills','sheeturl','characterurl','image','icon','kind','tags','updatedat','modifiedat'].forEach(k => {
      if ([...keys].some(key => key.includes(k))) score += 1;
    });
    if (text(raw.kind).toLowerCase() === 'character' || text(data.kind).toLowerCase() === 'character') score += 4;
    if (data.params || data.commands || data.memo) score += 2;
    return score;
  }

  function collectCandidates(value, out, depth = 0, source = '') {
    if (depth > 7 || value == null) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => collectCandidates(item, out, depth + 1, `${source}[${index}]`));
      return;
    }
    if (typeof value !== 'object') return;

    if (charScore(value) >= 5) out.push({ raw: value, source });

    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === 'object') collectCandidates(child, out, depth + 1, `${source}/${key}`);
    }
  }

  function normalizeTagValue(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap(normalizeTagValue);
    if (isPrimitive(value)) {
      return String(value)
        .split(/[、,\n]+/)
        .map(item => item.trim())
        .filter(Boolean)
        .filter(item => item !== '[object Object]');
    }
    if (typeof value === 'object') {
      const tag = first(value.label, value.name, value.title, value.text, value.value, value.tag);
      return tag ? [tag] : [];
    }
    return [];
  }

  function timestampMs(value) {
    if (value == null || value === '') return 0;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return 0;
      return value < 1e11 ? value * 1000 : value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return 0;
      if (/^\d{10,13}$/.test(trimmed)) return timestampMs(Number(trimmed));
      const parsed = Date.parse(trimmed);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'object') {
      if (typeof value.toDate === 'function') {
        try { return timestampMs(value.toDate()); } catch (_) { /* noop */ }
      }
      const seconds = value.seconds ?? value._seconds ?? value.sec;
      const nanos = value.nanoseconds ?? value._nanoseconds ?? value.nanos ?? 0;
      if (Number.isFinite(Number(seconds))) return Number(seconds) * 1000 + Number(nanos || 0) / 1e6;
      for (const key of ['$date', 'date', 'timestamp', 'value', 'updatedAt', 'modifiedAt']) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const parsed = timestampMs(value[key]);
          if (parsed) return parsed;
        }
      }
    }
    return 0;
  }

  function normalize(candidate, index) {
    const raw = candidate.raw;
    const data = raw.data && typeof raw.data === 'object' ? raw.data : raw;
    const meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};

    const sourceName = first(data.name, data.characterName, data.character_name, raw.name, `Character ${index + 1}`);
    const separatedName = splitNameAndReading(sourceName);
    const name = separatedName.name;
    const reading = first(
      data.furigana, data.yomigana, data.kana, data.nameKana, data.nameReading, data.ruby,
      getNested(data, ['profile.furigana','profile.yomigana','profile.kana','name.ruby']),
      separatedName.reading
    );
    const system = first(
      getNested(data, ['system','gameSystem','rules','systemName','profile.system']),
      getNested(raw, ['system','gameSystem','rules'])
    ) || inferSystem(data);
    const edition = first(data.edition, raw.edition, getNested(data, ['profile.edition']));
    const status = first(
      data.lifeStatus, data.status, data.state, data.characterStatus,
      getNestedRaw(data, ['profile.status']),
      meta.status, raw.status
    );
    const occupation = first(data.occupation, data.job, data.profession, data.role, meta.occupation, '');
    const tagsValue = data.tags ?? raw.tags ?? meta.tags ?? [];
    const tags = [...new Set(normalizeTagValue(tagsValue))];
    const image = first(
      data.iconUrl, data.imageUrl, data.image, data.icon, data.portrait,
      getNested(data, ['data.image','data.icon']), raw.image, raw.icon
    );
    const sheetUrl = first(data.externalUrl, data.sheetUrl, data.characterUrl, data.url, data.iacharaUrl, data.sheet_url);
    const memo = first(data.publicMemo, data.memo, data.note, data.description, data.profileText);
    const updatedAtRaw = getNestedRaw(data, [
      'updatedAt','updated_at','modifiedAt','modified_at','lastUpdated','lastUpdatedAt',
      'editedAt','edited_at','updateDate','update_date','timestamp','timestamps.updatedAt'
    ]) ?? getNestedRaw(raw, [
      'updatedAt','updated_at','modifiedAt','modified_at','lastUpdated','lastUpdatedAt',
      'editedAt','edited_at','updateDate','update_date','timestamp','timestamps.updatedAt'
    ]) ?? getNestedRaw(meta, ['updatedAt','updated_at','modifiedAt','modified_at','timestamp']);
    const createdAtRaw = getNestedRaw(data, ['createdAt','created_at','createdDate','created_date','timestamps.createdAt'])
      ?? getNestedRaw(raw, ['createdAt','created_at','createdDate','created_date','timestamps.createdAt'])
      ?? getNestedRaw(meta, ['createdAt','created_at']);
    const updatedAtMs = timestampMs(updatedAtRaw) || timestampMs(createdAtRaw);
    const updatedAt = updatedAtMs ? new Date(updatedAtMs).toISOString() : '';
    const explicitId = first(
      data.id, raw.id, data.uuid, raw.uuid, data.characterId, raw.characterId,
      data.character_id, raw.character_id
    );
    const id = explicitId || `${name}-${system}-${index}`;

    return {
      id,
      explicitId,
      name,
      reading,
      system: system || 'その他',
      edition,
      status,
      occupation,
      tags,
      image,
      sheetUrl,
      memo,
      stats: data.stats && typeof data.stats === 'object' ? data.stats : {},
      updatedAt,
      updatedAtMs,
      source: candidate.source
    };
  }

  function inferSystem(data) {
    let blob = '';
    try { blob = JSON.stringify(data).toLowerCase(); } catch (_) { return ''; }
    if (/coc.?7|クトゥルフ.?7|call of cthulhu.?7/.test(blob)) return 'CoC7';
    if (/coc.?6|クトゥルフ.?6|call of cthulhu/.test(blob)) return 'CoC6';
    if (/エモクロア|emoc/.test(blob)) return 'エモクロア';
    return '';
  }

  function isLikelyCharacter(char) {
    if (!char.name || char.name.length > 80) return false;
    const extra = [char.system, char.status, char.occupation, char.memo, char.image, char.sheetUrl, ...(char.tags || [])].filter(Boolean);
    return extra.length > 0;
  }

  function normalizeIdentity(value) {
    return text(value)
      .normalize('NFKC')
      .toLocaleLowerCase('ja')
      .replace(/[\s　・･._＿‐‑‒–—―ー~〜()（）\[\]【】「」『』:：]+/g, '');
  }

  function identityKey(char) {
    // Chara Libraの保存データは、同じ探索者のルート・data・履歴断片が
    // 複数候補として検出されることがある。表示上の探索者名を主キーにし、
    // 表記が同じものは最新・最も情報量の多い1件へ統合する。
    const nameKey = normalizeIdentity(char.name);
    if (nameKey) return `name:${nameKey}`;
    if (char.explicitId) return `id:${normalizeIdentity(char.explicitId)}`;
    if (char.sheetUrl) return `url:${text(char.sheetUrl).toLowerCase()}`;
    return `fallback:${normalizeIdentity(char.id)}`;
  }

  function richness(char) {
    let score = 0;
    ['explicitId','system','status','occupation','image','sheetUrl','memo'].forEach(key => {
      if (char[key]) score += key === 'memo' ? Math.min(5, Math.ceil(text(char[key]).length / 80)) : 2;
    });
    score += Math.min(5, (char.tags || []).length);
    if (char.updatedAtMs) score += 2;
    return score;
  }

  function mergeCharacterGroup(group) {
    const ordered = [...group].sort((a, b) =>
      (b.updatedAtMs - a.updatedAtMs) || (richness(b) - richness(a))
    );
    const newest = ordered[0];
    const richest = [...ordered].sort((a, b) => richness(b) - richness(a))[0];

    const choose = (key) => newest[key] || ordered.find(item => item[key])?.[key] || richest[key] || '';
    const tags = [...new Set(ordered.flatMap(item => item.tags || []).map(text).filter(Boolean))];

    return {
      ...richest,
      id: choose('explicitId') || choose('id'),
      explicitId: choose('explicitId'),
      name: choose('name'),
      reading: choose('reading'),
      system: choose('system') || 'その他',
      // ステータスは最新候補を優先し、引退済みの古い表示復活を防ぐ。
      status: newest.status || choose('status'),
      occupation: choose('occupation'),
      image: choose('image'),
      sheetUrl: choose('sheetUrl'),
      memo: choose('memo'),
      tags,
      updatedAtMs: Math.max(...ordered.map(item => item.updatedAtMs || 0)),
      updatedAt: '',
      source: ordered.map(item => item.source).filter(Boolean).join(' | ')
    };
  }

  function isRetired(char) {
    const statusBlob = [char.status, ...(char.tags || [])]
      .map(value => text(value).normalize('NFKC').toLocaleLowerCase('ja'))
      .join(' ');
    return /(^|[\s、,／/|])引退($|[\s、,／/|])|retired|retirement/.test(statusBlob)
      || statusBlob.trim() === '引退';
  }

  function dedupe(chars) {
    const groups = new Map();
    chars.forEach(char => {
      const key = identityKey(char);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(char);
    });

    const merged = [...groups.values()].map(mergeCharacterGroup);
    const retired = merged.filter(isRetired);
    const visible = merged.filter(char => !isRetired(char));

    state.stats = {
      candidates: chars.length,
      duplicates: Math.max(0, chars.length - merged.length),
      retired: retired.length
    };

    return visible.sort((a, b) => {
      const ad = a.updatedAtMs || 0;
      const bd = b.updatedAtMs || 0;
      return bd - ad || a.name.localeCompare(b.name, 'ja');
    });
  }

  function readLocalStorage() {
    const candidates = [];
    const canonical = localStorage.getItem(CHARA_LIBRA_STORAGE_KEY);
    if (canonical) {
      try { collectCandidates(JSON.parse(canonical), candidates, 0, `localStorage:${CHARA_LIBRA_STORAGE_KEY}`); }
      catch (_) { /* 壊れた保存データは後続の探索でフォールバック */ }
    }
    if (candidates.length) return candidates;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === CHARA_LIBRA_STORAGE_KEY) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try { collectCandidates(JSON.parse(raw), candidates, 0, `localStorage:${key}`); }
      catch (_) { /* JSON以外は対象外 */ }
    }
    return candidates;
  }

  async function readPublishedCharacters() {
    try {
      const response = await fetch(PUBLISHED_CHARACTER_URL, { cache: 'no-store' });
      if (!response.ok) return [];
      const payload = await response.json();
      const candidates = [];
      collectCandidates(payload, candidates, 0, `published:${PUBLISHED_CHARACTER_URL}`);
      return candidates;
    } catch (_) {
      return [];
    }
  }

  async function readIndexedDB() {
    if (!window.indexedDB || typeof indexedDB.databases !== 'function') return [];
    const candidates = [];
    let dbs = [];
    try { dbs = await indexedDB.databases(); } catch (_) { return []; }

    for (const info of dbs) {
      if (!info.name) continue;
      try {
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open(info.name);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
          req.onupgradeneeded = () => { req.transaction.abort(); reject(new Error('upgrade blocked')); };
        });
        const stores = [...db.objectStoreNames];
        for (const storeName of stores) {
          try {
            const values = await new Promise((resolve, reject) => {
              const tx = db.transaction(storeName, 'readonly');
              const req = tx.objectStore(storeName).getAll();
              req.onsuccess = () => resolve(req.result || []);
              req.onerror = () => reject(req.error);
            });
            collectCandidates(values, candidates, 0, `indexedDB:${info.name}/${storeName}`);
          } catch (_) { /* 読めないストアはスキップ */ }
        }
        db.close();
      } catch (_) { /* 読めないDBはスキップ */ }
    }
    return candidates;
  }

  function categoryFor(system) {
    const s = text(system).toLowerCase();
    if (/coc|クトゥルフ|cthulhu/.test(s)) return 'CoC';
    if (/エモクロア|emoc/.test(s)) return 'エモクロア';
    return text(system) || 'その他';
  }

  function initials(name) {
    const cleaned = text(name).replace(/[\s・._-]+/g, '');
    return cleaned.slice(0, 1) || '✦';
  }

  function characterOverrideKey(char) {
    if (char.explicitId) return `id:${normalizeIdentity(char.explicitId)}`;
    return `name:${normalizeIdentity(char.name)}|system:${normalizeIdentity(char.system)}`;
  }

  function applyCharacterOverrides(chars) {
    const rows = typeof window.getCharacterOverrides === 'function' ? window.getCharacterOverrides() : [];
    return chars.map(char => {
      const key = characterOverrideKey(char);
      const sourceName = normalizeIdentity(char.name);
      const override = rows.find(row => String(row.key || '') === key)
        || rows.find(row => row.sourceName && normalizeIdentity(row.sourceName) === sourceName);
      return {
        ...char,
        _overrideKey: key,
        isHidden: Boolean(override?.hidden),
        isDeleted: Boolean(override?.deleted)
      };
    });
  }

  function charactersForPage() {
    const editorActive = document.body.classList.contains('is-editor-mode');
    return state.characters.filter(char => !char.isDeleted && (editorActive || !char.isHidden));
  }

  function characterActionIcon(name) {
    const icons = {
      eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
      eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.1A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15.2 15.2 0 0 1-3 3.5M6.3 6.4C3.9 8 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3.2-.5"/><path d="M9.9 9.9A3 3 0 0 0 14.1 14"/></svg>',
      trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>'
    };
    return icons[name] || '';
  }

  function saveCharacterOverride(char, patch) {
    const rows = typeof window.getCharacterOverrides === 'function' ? window.getCharacterOverrides() : [];
    const key = char._overrideKey || characterOverrideKey(char);
    const index = rows.findIndex(row => String(row.key || '') === key);
    const next = {
      ...(index >= 0 ? rows[index] : {}),
      key,
      sourceName: char.name,
      sourceSystem: char.system,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    if (index >= 0) rows[index] = next;
    else rows.push(next);
    window.updateCharacterOverrides?.(rows);
    state.characters = applyCharacterOverrides(state.sourceCharacters);
    renderFilters();
    renderCards();
    renderPreview();
  }

  function statusLabel(value) {
    const labels = { alive: '生存', lost: 'ロスト', inactive: '保留', npc: 'NPC' };
    const key = text(value).toLowerCase();
    return labels[key] || text(value) || '未設定';
  }

  function statValue(char, key) {
    const raw = char.stats?.[key];
    if (raw && typeof raw === 'object') return first(raw.value, raw.current, raw.max);
    return text(raw);
  }

  function renderFilters() {
    if (!filterRow) return;
    const categories = [...new Set(charactersForPage().map(c => categoryFor(c.system)))];
    filterRow.innerHTML = ['all', ...categories].map(value => {
      const label = value === 'all' ? 'すべて' : value;
      return `<button type="button" class="filter-pill${state.filter === value ? ' is-active' : ''}" data-filter="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
    }).join('');
    filterRow.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => { state.filter = btn.dataset.filter; renderFilters(); renderCards(); });
    });
  }

  function renderCards() {
    if (!grid) return;
    const available = charactersForPage();
    const list = state.filter === 'all' ? available : available.filter(c => categoryFor(c.system) === state.filter);
    if (!list.length) {
      grid.innerHTML = `<div class="character-empty panel"><span>✦</span><h2>表示できるキャラクターがありません</h2><p>Chara Libraにキャラクターを登録し、このページを再読み込みしてください。</p></div>`;
      return;
    }
    grid.innerHTML = list.map(char => {
      const portrait = char.image
        ? `<img src="${escapeHtml(char.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
        : escapeHtml(initials(char.name));
      const edition = char.edition && char.edition !== char.system ? ` / ${char.edition}` : '';
      const meta = [statusLabel(char.status), char.occupation || '職業未設定'].map(v => `<span>${escapeHtml(v)}</span>`).join('');
      const stats = ['HP', 'MP', 'SAN'].map(key => `${key} ${statValue(char, key) || '—'}`).join(' / ');
      const tags = char.tags.slice(0, 3).map(tag => `<span class="character-tag">${escapeHtml(tag)}</span>`).join('');
      const visibilityLabel = char.isHidden ? '公開表示に戻す' : '公開ページで非表示にする';
      const content = `
        <article class="character-card panel${char.isHidden ? ' is-character-hidden' : ''}" data-character-key="${escapeHtml(char._overrideKey)}">
          <div class="character-card-portrait${char.image ? '' : ' is-fallback'}">${portrait}</div>
          <div class="character-card-body">
            <div class="character-card-editor-actions" aria-label="キャラクター編集操作">
              <button type="button" class="character-card-action visibility-action${char.isHidden ? ' is-off' : ''}" data-toggle-character-visibility title="${visibilityLabel}" aria-label="${visibilityLabel}">${characterActionIcon(char.isHidden ? 'eyeOff' : 'eye')}</button>
              <button type="button" class="character-card-action is-delete" data-delete-character title="削除" aria-label="キャラクターを一覧から削除">${characterActionIcon('trash')}</button>
            </div>
            <div class="character-card-title">
              <p class="character-reading">${char.reading ? escapeHtml(char.reading) : '&nbsp;'}</p>
              <h2 title="${escapeHtml(char.name)}">${escapeHtml(char.name)}</h2>
              <p>${escapeHtml(char.system + edition)}</p>
            </div>
            <div class="character-meta">${char.isHidden ? '<span class="character-hidden-badge">非公開</span>' : ''}${meta}</div>
            <p class="character-stats">${escapeHtml(stats)}</p>
            <div class="character-tags">${tags || '<span class="character-tag is-empty">タグなし</span>'}</div>
          </div>
        </article>`;
      return content;
    }).join('');
  }

  function renderPreview() {
    if (!previewGrid) return;
    const latest = state.characters.filter(char => !char.isHidden && !char.isDeleted).slice(0, 4);
    if (!latest.length) {
      previewGrid.innerHTML = '<p class="chara-preview-empty panel">Charactersページに表示できるキャラクターがありません。</p>';
      return;
    }
    previewGrid.innerHTML = latest.map(char => {
      const avatar = char.image
        ? `<img src="${escapeHtml(char.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
        : escapeHtml(initials(char.name));
      const edition = char.edition && char.edition !== char.system ? ` / ${char.edition}` : '';
      return `
        <a href="characters.html" class="chara-chip panel">
          <div class="chara-avatar">${avatar}</div>
          <div>
            <div class="chara-name">${escapeHtml(char.name)}</div>
            <div class="chara-sys">${escapeHtml(char.system + edition)}</div>
          </div>
        </a>`;
    }).join('');
  }

  async function loadCharacters() {
    if (statusEl) statusEl.textContent = 'Chara Libraのブラウザ保存データを確認中…';
    refreshBtn?.setAttribute('disabled', '');
    try {
      const [published, idb] = await Promise.all([readPublishedCharacters(), readIndexedDB()]);
      const local = readLocalStorage();
      state.localCount = local.length + idb.length;
      state.publishedCount = published.length;
      const normalized = [...published, ...local, ...idb].map(normalize).filter(isLikelyCharacter);
      state.sourceCharacters = dedupe(normalized);
      state.characters = applyCharacterOverrides(state.sourceCharacters);
      state.filter = 'all';
      renderFilters();
      renderCards();
      renderPreview();

      if (statusEl && state.characters.length) {
        const details = [];
        if (state.stats.duplicates) details.push(`重複候補${state.stats.duplicates}件を統合`);
        if (state.stats.retired) details.push(`引退${state.stats.retired}人を除外`);
        const source = state.localCount ? 'Chara Libra' : '公開JSON';
        statusEl.textContent = `${source}から${state.characters.length}人を更新日の新しい順で読み込みました。${details.length ? `（${details.join('・')}）` : ''}`;
      } else if (statusEl) {
        statusEl.textContent = 'Chara Libraの保存データを検出できませんでした。同じブラウザ・同じkumachansteps.github.io上でChara Libraを利用しているか確認してください。';
      }
    } catch (error) {
      console.error(error);
      state.characters = [];
      renderFilters();
      renderCards();
      renderPreview();
      if (statusEl) statusEl.textContent = 'ブラウザ保存データの読み込みに失敗しました。';
    } finally {
      refreshBtn?.removeAttribute('disabled');
    }
  }

  refreshBtn?.addEventListener('click', loadCharacters);
  grid?.addEventListener('click', event => {
    if (!document.body.classList.contains('is-editor-mode')) return;
    const card = event.target.closest('.character-card[data-character-key]');
    if (!card) return;
    const char = state.characters.find(item => item._overrideKey === card.dataset.characterKey);
    if (!char) return;

    if (event.target.closest('[data-toggle-character-visibility]')) {
      saveCharacterOverride(char, { hidden: !char.isHidden, deleted: false });
      return;
    }

    if (event.target.closest('[data-delete-character]')) {
      if (!window.confirm(`「${char.name}」をサイトのキャラクター一覧から削除しますか？\n\nChara Libraの元データは削除されません。`)) return;
      saveCharacterOverride(char, { hidden: true, deleted: true });
    }
  });
  window.addEventListener('star-map-data-changed', () => {
    state.characters = applyCharacterOverrides(state.sourceCharacters);
    renderFilters();
    renderCards();
    renderPreview();
  });
  window.addEventListener('star-map-editor-mode', () => {
    renderFilters();
    renderCards();
  });
  window.addEventListener('storage', loadCharacters);
  loadCharacters();
})();
