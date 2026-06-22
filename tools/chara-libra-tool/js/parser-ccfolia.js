(function () {
  'use strict';

  const STAT_ALIASES = {
    hitpoints: 'HP', hp: 'HP', hpcurrent: 'HP',
    mp: 'MP', magicpoints: 'MP',
    san: 'SAN', sanity: 'SAN',
    str: 'STR', con: 'CON', pow: 'POW', dex: 'DEX', app: 'APP', siz: 'SIZ', int: 'INT', edu: 'EDU',
    db: 'DB', bld: 'BLD', build: 'BLD', '\u30d3\u30eb\u30c9': 'BLD', mov: 'MOV', move: 'MOV',
    luck: '幸運', '\u5e78\u904b': '幸運', idea: 'アイデア', knowledge: '知識', '\u77e5\u8b58': '知識'
  };

  const ENTITY_HINT_KEYS = ['name', 'iconUrl', 'status', 'params', 'commands', 'memo', 'externalUrl', 'initiative'];

  function normalizeLabel(label) {
    const key = String(label || '').trim();
    const lower = key.toLowerCase();
    return STAT_ALIASES[lower] || STAT_ALIASES[key] || key;
  }

  function parseMaybeNumber(value) {
    if (typeof value === 'number') return value;
    const raw = String(value ?? '').trim();
    if (/^[+-]?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    return raw;
  }

  function decodeText(value) {
    return String(value ?? '')
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  function safeJsonParse(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) throw new Error('CCFOLIA駒データが空です。');
    return JSON.parse(trimmed);
  }

  function scoreEntity(node) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return -1;
    let score = 0;
    ENTITY_HINT_KEYS.forEach((key) => {
      if (key in node) score += 2;
    });
    if (typeof node.name === 'string') score += 4;
    if (Array.isArray(node.status)) score += 6;
    if (Array.isArray(node.params)) score += 6;
    if (typeof node.commands === 'string' || typeof node.command === 'string') score += 5;
    if (typeof node.memo === 'string') score += 3;
    if (typeof node.iconUrl === 'string') score += 3;
    return score;
  }

  function findBestEntity(root) {
    const visited = new Set();
    let best = null;
    let bestScore = -1;

    function walk(node) {
      if (!node || typeof node !== 'object' || visited.has(node)) return;
      visited.add(node);

      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }

      const score = scoreEntity(node);
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }

      Object.values(node).forEach(walk);
    }

    walk(root);
    return best || (root && typeof root === 'object' && !Array.isArray(root) ? root : {});
  }

  function firstStringFromKeys(entity, keys) {
    for (const key of keys) {
      const value = entity?.[key];
      if (typeof value === 'string' && value.trim()) return decodeText(value.trim());
    }
    return '';
  }

  function firstValueFromKeys(entity, keys, fallback = '') {
    for (const key of keys) {
      if (entity && entity[key] !== undefined && entity[key] !== null && entity[key] !== '') return entity[key];
    }
    return fallback;
  }

  function normalizeEntryArray(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object' && Array.isArray(value.values)) return value.values;
    if (value && typeof value === 'object' && Array.isArray(value.items)) return value.items;
    return [];
  }

  function parseStatus(status) {
    const result = {};
    normalizeEntryArray(status).forEach((entry) => {
      const label = normalizeLabel(entry.label || entry.name);
      if (!label) return;
      result[label] = {
        value: parseMaybeNumber(entry.value ?? entry.current ?? entry.max ?? ''),
        max: parseMaybeNumber(entry.max ?? entry.value ?? entry.current ?? ''),
      };
    });
    return result;
  }

  function parseParams(params) {
    const result = {};
    normalizeEntryArray(params).forEach((entry) => {
      const label = normalizeLabel(entry.label || entry.name);
      if (!label) return;
      result[label] = parseMaybeNumber(entry.value ?? entry.current ?? '');
    });
    return result;
  }

  function detectEdition(commands) {
    const text = String(commands || '');
    if (/\bCCB<=/i.test(text)) return 'CoC6';
    if (/(?:STR|CON|POW|DEX|APP|SIZ|INT|EDU)\s*[}）)]?\s*(?:\*|×|x)\s*5/i.test(text)) return 'CoC6';
    if (/[【\[]\s*(?:STR|CON|POW|DEX|APP|SIZ|INT|EDU)\s*(?:\*|×|x)\s*5\s*[】\]]/i.test(text)) return 'CoC6';
    if (/\bCC<=/i.test(text) || /\bCC\s*</i.test(text)) return 'CoC7';
    if (/\u8fd1\u63a5\u6226\u95d8|\u5c04\u6483\uff1a|\u96a0\u5bc6|\u624b\u3055\u3070\u304d/.test(text)) return 'CoC7';
    if (/\u3053\u3076\u3057|\u30de\u30fc\u30b7\u30e3\u30eb\u30a2\u30fc\u30c4|\u5fcd\u3073\u6b69\u304d|\u96a0\u308c\u308b/.test(text)) return 'CoC6';
    return 'その他';
  }

  function detectSystem(edition) {
    if (edition === 'CoC6') return 'クトゥルフ神話TRPG';
    if (edition === 'CoC7') return '新クトゥルフ神話TRPG';
    return 'その他';
  }

  function extractOccupation(memo) {
    const text = String(memo || '');
    const match = text.match(/(?:\u8077\u696d|Occupation)\s*[:：]\s*([^\n]+)/i);
    return match ? match[1].trim() : '';
  }

  function extractCommandStats(commands) {
    const result = {};
    const lines = decodeText(commands || '').split(/\n+/);

    lines.forEach((line) => {
      const parsed = parseCommandRollLine(line);
      if (!parsed) return;

      const key = normalizeCommandStatLabel(parsed.label);
      if (!key) return;

      result[key] = parsed.value;
    });

    return result;
  }

  function parseCommandRollLine(line) {
    const text = String(line || '').trim();
    if (!text) return null;

    const match = text.match(/^(?:s?CCB?|CC|1D100|1d100)\s*(?:<=|＜=|<＝|≦|<)\s*(\d{1,3})\s*(?:【([^】]+)】|\[([^\]]+)\]|(.+?))\s*$/i);
    if (!match) return null;

    const label = String(match[2] || match[3] || match[4] || '').trim();
    if (!label) return null;

    return {
      value: Number(match[1]),
      label,
    };
  }

  function normalizeCommandStatLabel(label) {
    const cleaned = String(label || '')
      .replace(/[［\[][^］\]]+[］\]]/g, '')
      .replace(/【|】/g, '')
      .trim();

    if (/^(?:アイデア|IDEA)$/i.test(cleaned)) return 'アイデア';
    if (/^(?:知識|KNOW|KNOWLEDGE)$/i.test(cleaned)) return '知識';
    if (/^(?:幸運|LUCK)$/i.test(cleaned)) return '幸運';

    return '';
  }

  function applyDerivedStats(stats, edition) {
    const normalized = { ...(stats || {}) };

    if (isCoc7Edition(edition) && isBlankStat(normalized.DB)) {
      const derivedDb = deriveDbFromBld(normalized.BLD);
      if (derivedDb) normalized.DB = derivedDb;
    }

    return normalized;
  }

  function isCoc7Edition(edition) {
    const label = String(edition || '').toLowerCase();
    return label.includes('coc7') || label.includes('7') || label.includes('新クトゥルフ');
  }

  function isBlankStat(value) {
    return value === undefined || value === null || value === '' || value === '-';
  }

  function deriveDbFromBld(bld) {
    const raw = bld && typeof bld === 'object' ? bld.value : bld;
    const value = Number(String(raw ?? '').trim());

    if (!Number.isFinite(value)) return '';
    if (value === 0) return '-';
    if (value === 1) return '+1D4';
    if (value === 2) return '+1D6';
    return '';
  }

  function extractSkills(commands) {
    const text = decodeText(commands || '');
    const skills = new Map();
    let section = '';

    text.split(/\n+/).forEach((line) => {
      const nextSection = detectSkillExtractionSection(line, section);

      if (nextSection.changed) {
        section = nextSection.section;
        return;
      }

      if (shouldSkipSkillExtractionSection(section)) return;

      const parsed = parseSkillCommandLine(line);
      if (!parsed) return;

      const value = Number(parsed.value);
      const name = normalizeSkillDisplayName(parsed.name);
      if (!name || shouldIgnoreSkillName(name)) return;

      if (!skills.has(name) || skills.get(name).value < value) {
        skills.set(name, { name, value, category: guessSkillCategory(name) });
      }
    });

    return Array.from(skills.values()).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'ja'));
  }

  function detectSkillExtractionSection(line, currentSection) {
    const text = String(line || '').trim();

    if (!text) return { section: currentSection, changed: false };

    if (/^(?:◼️|■|□)?\s*ダイス/.test(text)) return { section: 'dice', changed: true };
    if (/探索技能/.test(text)) return { section: 'skill', changed: true };
    if (/戦闘技能/.test(text)) return { section: 'skill', changed: true };
    if (/行動技能/.test(text)) return { section: 'skill', changed: true };
    if (/交渉|対人技能/.test(text)) return { section: 'skill', changed: true };
    if (/知識技能/.test(text)) return { section: 'skill', changed: true };
    if (/ダメージ|武器/.test(text)) return { section: 'damage', changed: true };
    if (/その他\s*\/\s*未分類/.test(text)) return { section: 'skill', changed: true };
    if (/初期値/.test(text)) return { section: 'initial', changed: true };
    if (/能力値/.test(text)) return { section: 'status', changed: true };
    if (/パラメータ化|パラメータ/.test(text)) return { section: 'params', changed: true };

    if (/^=+.+?=+$/.test(text)) return { section: currentSection || 'meta', changed: true };
    if (/^[🟦🟥🟧🟪⬜️◼️■□]/.test(text) && !/^(?:s?CCB?|CC|1D100|1d100|D100|d100)/i.test(text)) {
      return { section: currentSection || 'meta', changed: true };
    }

    return { section: currentSection, changed: false };
  }

  function shouldSkipSkillExtractionSection(section) {
    return ['dice', 'damage', 'initial', 'status', 'params', 'meta'].includes(section);
  }

  function parseSkillCommandLine(line) {
    const text = String(line || '').trim();
    if (!text) return null;

    const match = text.match(/^(?:s?CCB?|CC|1D100|1d100|D100|d100)\s*(?:<=|＜=|<＝|≦|<)\s*(\d{1,3})\s*(?:【([^】]+)】|\[([^\]]+)\]|(.+?))\s*$/i);
    if (!match) return null;

    const value = Number(match[1]);
    const name = String(match[2] || match[3] || match[4] || '').trim();

    if (!Number.isFinite(value) || value < 0 || value > 100 || !name) return null;
    return { value, name };
  }

  function normalizeSkillDisplayName(name) {
    return String(name || '')
      .replace(/[【】]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/（（/g, '（')
      .replace(/））/g, '）')
      .replace(/\(\(/g, '(')
      .replace(/\)\)/g, ')')
      .trim();
  }

  function shouldIgnoreSkillName(name) {
    const cleaned = String(name || '').trim();
    if (!cleaned) return true;

    if (/^(?:SAN|正気度|正気度ロール|幸運|アイデア|知識)$/i.test(cleaned)) return true;
    if (/^(?:STR|CON|POW|DEX|APP|SIZ|INT|EDU|MOV|MOVE|DB|BLD|BUILD)$/i.test(cleaned)) return true;
    if (/^(?:HP|MP)$/i.test(cleaned)) return true;
    if (/ダメージ|damage/i.test(cleaned)) return true;

    return false;
  }

  function guessSkillCategory(name) {
    if (/\u76ee\u661f|\u805e\u304d\u8033|\u56f3\u66f8\u9928|\u8ffd\u8de1|\u96a0\u5bc6|\u9375\u958b\u3051/.test(name)) return '探索';
    if (/\u8aac\u5f97|\u8a00\u3044\u304f\u308b\u3081|\u4fe1\u7528|\u5fc3\u7406\u5b66|\u9b45\u60d1|\u5a01\u5727/.test(name)) return '交渉';
    if (/\u56de\u907f|\u8fd1\u63a5|\u683c\u95d8|\u62f3\u92c3|\u6295\u64f2|\u5c04\u6483|\u5200|\u30ca\u30a4\u30d5|\u3053\u3076\u3057/.test(name)) return '戦闘';
    if (/\u533b\u5b66|\u5fdc\u6025|\u79d1\u5b66|\u6b74\u53f2|\u30aa\u30ab\u30eb\u30c8|\u30af\u30c8\u30a5\u30eb\u30d5/.test(name)) return '知識';
    return 'その他';
  }

  function makeId() {
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const rand = Math.random().toString(36).slice(2, 7);
    return `chara_${stamp}_${rand}`;
  }

  function inferLifeStatus(entity, memo) {
    const raw = String(entity.lifeStatus || entity.statusCategory || entity.state || '').toLowerCase();
    if (['alive', 'lost', 'retired', 'inactive', 'npc'].includes(raw)) return raw;
    const tags = Array.isArray(entity.tags) ? entity.tags.join('\n') : '';
    const text = `${memo || ''}\n${entity.name || ''}\n${tags}\n${entity.note || ''}`;
    if (/(?:^|[\s　:：※])ロスト(?:[\s　:：済]|$)|\bLOST\b|死亡|死亡済|死亡済み|lost/i.test(text)) return 'lost';
    if (/\bNPC\b/i.test(text)) return 'npc';
    return 'alive';
  }

  function parse(text, existingId) {
    const rawRoot = safeJsonParse(text);
    const entity = findBestEntity(rawRoot);
    const now = new Date().toISOString();
    const commands = firstStringFromKeys(entity, ['commands', 'command', 'chatPalette', 'chat_palette', 'palette']);
    const memo = firstStringFromKeys(entity, ['memo', 'note', 'description']);
    const edition = firstStringFromKeys(entity, ['edition']) || detectEdition(commands);
    const system = firstStringFromKeys(entity, ['system', 'gameSystem']) || detectSystem(edition);
    const status = parseStatus(firstValueFromKeys(entity, ['status', 'statuses'], []));
    const params = parseParams(firstValueFromKeys(entity, ['params', 'parameters'], []));
    const commandStats = extractCommandStats(commands);
    const stats = applyDerivedStats({ ...params, ...status, ...commandStats }, edition);

    return {
      id: existingId || makeId(),
      name: firstStringFromKeys(entity, ['name', 'characterName']) || '名称未設定',
      reading: firstStringFromKeys(entity, ['reading', 'kana']),
      system,
      edition,
      occupation: firstStringFromKeys(entity, ['occupation']) || extractOccupation(memo),
      age: firstStringFromKeys(entity, ['age']),
      gender: firstStringFromKeys(entity, ['gender', 'sex']),
      height: firstStringFromKeys(entity, ['height']),
      weight: firstStringFromKeys(entity, ['weight']),
      themeColor: firstStringFromKeys(entity, ['themeColor', 'color']),
      lifeStatus: inferLifeStatus(entity, memo),
      tags: Array.isArray(entity.tags) ? entity.tags.filter(Boolean) : [],
      iconUrl: firstStringFromKeys(entity, ['iconUrl', 'imageUrl', 'icon', 'avatar', 'face']),
      tachieUrl: firstStringFromKeys(entity, ['tachieUrl']),
      externalUrl: firstStringFromKeys(entity, ['externalUrl', 'url', 'sheetUrl', 'characterUrl']),
      initiative: firstValueFromKeys(entity, ['initiative', 'init'], ''),
      stats,
      skills: extractSkills(commands),
      memo,
      commands,
      source: {
        ccfoliaRaw: rawRoot,
        iacharaText: '',
      },
      timestamps: {
        createdAt: now,
        updatedAt: now,
        ccfoliaImportedAt: now,
        iacharaImportedAt: '',
      },
    };
  }

  window.CharaLibraParser = {
    parse,
    extractSkills,
    detectEdition,
  };
})();
