(function () {
  'use strict';

  const STATUS_LABELS = {
    alive: '生存',
    lost: 'ロスト',
    retired: '引退',
    inactive: '保留',
    npc: 'NPC',
  };

  function formatDate(iso, fallback = '未取込') {
    if (!iso) return fallback;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return fallback;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
  }

  function statValue(character, key) {
    const raw = character.stats && character.stats[key];
    if (raw && typeof raw === 'object') return raw.value ?? '';
    return raw ?? '';
  }

  function splitDisplayName(name) {
    const raw = String(name || '').trim();
    const match = raw.match(/^(.*?)\s*[（(]([^（）()]+)[）)]\s*$/);
    if (!match) return { main: raw, ruby: '' };
    const main = match[1].trim() || raw;
    const ruby = match[2].trim();
    return { main, ruby };
  }

  function renderDisplayName(name) {
    const parts = splitDisplayName(name);
    return `
      <div class="character-name-block">
        ${parts.ruby ? `<div class="character-ruby">${escapeHtml(parts.ruby)}</div>` : ''}
        <div class="character-name">${escapeHtml(parts.main)}</div>
      </div>`;
  }

  function editionBadgeClass(label) {
    const raw = String(label || '').toLowerCase();
    if (raw.includes('coc6') || raw.includes('6版')) return 'is-coc6';
    if (raw.includes('coc7') || raw.includes('7版')) return 'is-coc7';
    if (raw.includes('エモクロア') || raw.includes('emoklore')) return 'is-emoklore';
    return 'is-default';
  }

  function avatar(character) {
    if (character.iconUrl) {
      return `<img class="avatar" src="${escapeAttr(character.iconUrl)}" alt="${escapeAttr(character.name)}">`;
    }
    const initial = [...String(character.name || '?')][0] || '?';
    return `<div class="avatar placeholder" aria-hidden="true">${escapeHtml(initial)}</div>`;
  }

  function iconCard(character) {
    const status = character.lifeStatus || 'alive';
    const editionLabel = character.edition || character.system || 'Other';
    return `
      <article class="character-icon-card status-${escapeAttr(status)}" data-character-id="${escapeAttr(character.id)}" tabindex="0" role="button" aria-label="${escapeAttr(character.name)}を開く">
        <div class="avatar-stage icon-only">
          ${avatar(character)}
          <span class="edition-badge ${editionBadgeClass(editionLabel)}">${escapeHtml(editionLabel)}</span>
          ${renderDisplayName(character.name)}
        </div>
      </article>`;
  }

  function infoCard(character) {
    const status = character.lifeStatus || 'alive';
    const editionLabel = character.edition || character.system || 'Other';
    const tags = (character.tags || []).slice(0, 4).map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('');
    return `
      <article class="character-info-card status-${escapeAttr(status)}" data-character-id="${escapeAttr(character.id)}" tabindex="0" role="button" aria-label="${escapeAttr(character.name)}を開く">
        <div class="avatar-stage compact">
          ${avatar(character)}
          <span class="edition-badge ${editionBadgeClass(editionLabel)}">${escapeHtml(editionLabel)}</span>
        </div>
        <div class="card-meta">
          <h3>${escapeHtml(character.name)}</h3>
          <div class="card-subline">${escapeHtml(character.system || 'Other')} / ${escapeHtml(character.occupation || '職業未設定')} / <span class="status-text">${escapeHtml(STATUS_LABELS[status] || status)}</span></div>
          <div class="card-stats">HP ${escapeHtml(statValue(character, 'HP')) || '-'} / MP ${escapeHtml(statValue(character, 'MP')) || '-'} / SAN ${escapeHtml(statValue(character, 'SAN')) || '-'}</div>
          <div class="card-tags">${tags}</div>
          <div class="card-updated">Updated: ${formatDate(character.timestamps?.updatedAt, '未更新')}</div>
        </div>
      </article>`;
  }

  function renderGrid(container, characters, view) {
    container.className = `character-grid ${view === 'card' ? 'card-view' : 'icon-view'}`;
    container.innerHTML = characters.map((character) => view === 'card' ? infoCard(character) : iconCard(character)).join('');
    trimTransparentAvatars(container);
  }

  function renderMetrics(characters) {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    document.getElementById('metricTotal').textContent = characters.length;
    document.getElementById('metricAlive').textContent = characters.filter((c) => c.lifeStatus === 'alive').length;
    document.getElementById('metricLost').textContent = characters.filter((c) => c.lifeStatus === 'lost').length;
    document.getElementById('metricRecent').textContent = characters.filter((c) => {
      const updated = new Date(c.timestamps?.updatedAt || 0).getTime();
      return updated && now - updated <= sevenDays;
    }).length;
  }

  function fillDetail(character) {
    document.getElementById('detailNameInput').value = character.name;
    document.getElementById('detailNameInput').size = Math.max(16, Math.min(104, [...String(character.name || '')].length + 3));
    document.getElementById('detailSystem').textContent = `${character.system || 'Other'} / ${character.edition || ''}`;
    const icon = document.getElementById('detailIcon');
    const iconWrap = document.getElementById('detailIconWrap');
    icon.crossOrigin = 'anonymous';
    icon.dataset.originalSrc = character.iconUrl || '';
    icon.src = character.iconUrl || '';
    icon.alt = character.name;
    icon.style.display = character.iconUrl ? '' : 'none';
    if (iconWrap) {
      const iconStateClass = character.iconUrl ? 'detail-has-icon' : 'detail-no-icon';
      iconWrap.className = `detail-icon-wrap ${detailEditionClass(character)} detail-status-${escapeAttr(character.lifeStatus || 'alive')} ${iconStateClass}`;
    }

    document.getElementById('detailOccupation').value = character.occupation || '';
    document.getElementById('detailLifeStatus').value = character.lifeStatus || 'alive';
    document.getElementById('detailTags').value = (character.tags || []).join(', ');
    document.getElementById('detailAge').value = character.age || '';
    document.getElementById('detailGender').value = character.gender || '';
    document.getElementById('detailHeight').value = character.height || '';
    document.getElementById('detailWeight').value = character.weight || '';
    const themeColor = validThemeColor(character.themeColor || '') ? character.themeColor : '';
    document.getElementById('detailThemeColor').value = themeColor;
    updateThemeSwatch(themeColor);
    document.getElementById('detailExternalUrl').value = character.externalUrl || '';

    const sheetLink = document.getElementById('detailExternalLink');
    if (character.externalUrl) {
      sheetLink.href = character.externalUrl;
      sheetLink.textContent = '🔗  キャラシURL';
      sheetLink.hidden = false;
    } else {
      sheetLink.href = '#';
      sheetLink.hidden = true;
    }

    document.getElementById('detailMemo').value = character.memo || '';
    document.getElementById('detailCommands').value = character.commands || '';

    document.getElementById('detailStats').innerHTML = buildStatsHtml(character);
    const detailSkills = sortDetailSkills(character.skills || []);
    document.getElementById('detailSkills').innerHTML = detailSkills.map((skill) => `<span class="skill-chip">${escapeHtml(skill.name)} <strong>${escapeHtml(skill.value)}</strong></span>`).join('') || '<span class="muted">技能を抽出できませんでした</span>';
    document.getElementById('detailTimestamps').innerHTML = [
      `最終編集：${formatDate(character.timestamps?.updatedAt, '未更新')}`,
      `CCFOLIA JSON取込：${formatDate(character.timestamps?.ccfoliaImportedAt, '未取込')}`,
      `いあきゃらTXT取込：${formatDate(character.timestamps?.iacharaImportedAt, '未取込')}`,
    ].join('<br>');

    trimTransparentAvatars(document.getElementById('characterDialog'));
    requestAnimationFrame(alignDetailIconToProfileBottom);
  }


  function alignDetailIconToProfileBottom() {
    const dialog = document.getElementById('characterDialog');
    if (!dialog || !dialog.open) return;

    const hero = dialog.querySelector('.detail-hero-v2');
    const profile = dialog.querySelector('.detail-profile-fields');
    const iconWrap = dialog.querySelector('#detailIconWrap');

    if (!hero || !profile || !iconWrap) return;

    const heroTop = hero.getBoundingClientRect().top;
    const profileBottom = profile.getBoundingClientRect().bottom;
    const target = Math.round(profileBottom - heroTop);

    if (!Number.isFinite(target) || target <= 0) return;

    const clamped = Math.max(156, Math.min(238, target));
    iconWrap.style.width = `${clamped}px`;
    iconWrap.style.height = `${clamped}px`;
  }

  function detailEditionClass(character) {
    const label = `${character?.edition || ''} ${character?.system || ''}`.toLowerCase();
    if (label.includes('coc6') || label.includes('6版')) return 'detail-edition-coc6';
    if (label.includes('coc7') || label.includes('7版')) return 'detail-edition-coc7';
    if (label.includes('エモクロア') || label.includes('emoklore')) return 'detail-edition-emoklore';
    return 'detail-edition-default';
  }

  function sortDetailSkills(skills) {
    const hidden = new Set(['知識', 'アイデア', '幸運', 'SAN', '正気度ロール']);
    return [...skills]
      .filter((skill) => !hidden.has(String(skill.name || '').trim()))
      .sort((a, b) => {
        const ca = detailSkillCategory(a.name);
        const cb = detailSkillCategory(b.name);
        if (ca.weight !== cb.weight) return ca.weight - cb.weight;
        if (ca.index !== cb.index) return ca.index - cb.index;
        return String(a.name || '').localeCompare(String(b.name || ''), 'ja');
      });
  }

  function detailSkillCategory(name) {
    const skill = String(name || '');
    const sections = [
      { weight: 0, words: ['目星', '聞き耳', '図書館'] },
      { weight: 1, words: [
        '回避', '近接戦闘', 'こぶし', 'キック', '組み付き', '頭突き', '投擲', 'マーシャルアーツ',
        '三節棍', '火炎放射器', '拳銃', '射撃', 'ショットガン', 'ライフル', 'サブマシンガン', 'マシンガン',
        '日本刀', '刀', '太刀', '短刀', 'ナイフ', '剣', '槍', '薙刀', '斧', '鞭', 'ムチ', '弓', 'クロスボウ', 'ボウガン',
        '棍', 'トンファー', 'ヌンチャク', '鎖鎌', 'スタンガン', 'グレネード', 'ランチャー'
      ] },
      { weight: 2, words: ['応急手当', '鍵開け', '手さばき', '隠密', '隠す', '隠れる', '忍び歩き', '写真術', '精神分析', '追跡', '登攀', '鑑定', '運転', '機械修理', '重機械操作', '乗馬', '水泳', '製作', '操縦', '跳躍', '電気修理', 'ナビゲート', '変装', 'ダイビング'] },
      { weight: 3, words: ['言いくるめ', '信用', '説得', '値切り', '威圧', '魅惑', '心理学', '語'] },
      { weight: 4, words: ['医学', 'オカルト', '化学', '科学', '芸術', '経理', '考古学', 'コンピューター', '人類学', '生物学', '地質学', '電子工学', '天文学', '博物学', '物理学', '法律', '薬学', '歴史', '自然', 'サバイバル', '伝承', 'クトゥルフ神話'] },
    ];

    for (const section of sections) {
      const index = section.words.findIndex((word) => skill.includes(word));
      if (index >= 0) return { weight: section.weight, index };
    }

    return { weight: 99, index: 999 };
  }

  function buildStatsHtml(character) {
    const groups = [
      ['HP', 'MP', 'SAN'],
      ['STR', 'CON', 'POW', 'DEX'],
      ['APP', 'SIZ', 'INT', 'EDU'],
    ];

    if (isCoc7Character(character)) {
      groups.push(['DB', 'BLD', 'MOV']);
    }

    groups.push(['アイデア', '知識', '幸運']);

    return groups.map((group) => `
      <div class="stat-row stat-row-${group.length}">
        ${group.map((key) => statPill(character, key)).join('')}
      </div>
    `).join('');
  }

  function isCoc7Character(character) {
    const label = `${character?.edition || ''} ${character?.system || ''}`.toLowerCase();
    return label.includes('coc7') || label.includes('7版') || label.includes('新クトゥルフ');
  }

  function statPill(character, key) {
    const value = detailStatValue(character, key);
    return `<span class="stat-pill stat-${escapeAttr(key)}">${escapeHtml(key)} <strong>${escapeHtml(value)}</strong></span>`;
  }

  function detailStatValue(character, key) {
    const raw = character.stats && character.stats[key];
    if (raw && typeof raw === 'object') return raw.value ?? '-';
    if (raw !== undefined && raw !== null && raw !== '') return raw;

    if (key === 'DB' && isCoc7Character(character)) {
      const derivedDb = deriveDbFromBld(character.stats && character.stats.BLD);
      if (derivedDb) return derivedDb;
    }

    const fromCommand = commandValue(character.commands, key);
    if (fromCommand !== '') return fromCommand;

    const foundSkill = (character.skills || []).find((skill) => skill.name === key);
    return foundSkill ? foundSkill.value : '-';
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

  function commandValue(commands, label) {
    const normalizedLabel = String(label || '').trim();
    const lines = String(commands || '').split(/\r?\n/);

    for (const line of lines) {
      const parsed = parseCommandRollLine(line);
      if (!parsed) continue;
      if (normalizeStatLabel(parsed.label) !== normalizedLabel) continue;
      return parsed.value;
    }

    return '';
  }

  function parseCommandRollLine(line) {
    const match = String(line || '').trim().match(/^(?:s?CCB?|CC|1d100|1D100)\s*(?:<=|＜=|<＝|≦|<)\s*(\d{1,3}|\{[^}]+\})\s*(?:【([^】]+)】|\[([^\]]+)\]|(.+?))?\s*$/i);
    if (!match) return null;

    return {
      value: match[1],
      label: String(match[2] || match[3] || match[4] || '').trim(),
    };
  }

  function normalizeStatLabel(label) {
    const cleaned = String(label || '')
      .replace(/【|】/g, '')
      .trim();

    if (/^(?:アイデア|IDEA)$/i.test(cleaned)) return 'アイデア';
    if (/^(?:知識|KNOW|KNOWLEDGE)$/i.test(cleaned)) return '知識';
    if (/^(?:幸運|LUCK)$/i.test(cleaned)) return '幸運';
    return cleaned;
  }


  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }



  function validThemeColor(value) {
    return /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(String(value || '').trim());
  }

  function updateThemeSwatch(value) {
    const swatch = document.getElementById('detailThemeSwatch');
    if (!swatch) return;
    const color = String(value || '').trim();
    if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color)) {
      swatch.style.background = color;
      swatch.style.opacity = '1';
    } else {
      swatch.style.background = 'linear-gradient(135deg, #8aa8ff, #ffcf7d)';
      swatch.style.opacity = color ? '.9' : '.38';
    }
  }

  function trimTransparentAvatars(scope = document) {
    const images = Array.from(scope.querySelectorAll('img.trim-avatar'));
    images.forEach((img) => {
      const source = img.dataset.originalSrc || img.currentSrc || img.src;
      if (!source || source.startsWith('data:') || img.dataset.trimmed === 'done' || img.dataset.trimmed === 'fail') return;

      const run = () => trimImageElement(img, source);
      if (img.complete && img.naturalWidth) run();
      else img.addEventListener('load', run, { once: true });
    });
  }

  function trimImageElement(targetImg, source) {
    const workImg = new Image();
    workImg.crossOrigin = 'anonymous';
    workImg.onload = () => {
      try {
        const trimmed = buildTrimmedIconDataUrl(workImg);
        if (trimmed) {
          targetImg.src = trimmed;
          targetImg.dataset.trimmed = 'done';
        } else {
          targetImg.dataset.trimmed = 'fail';
        }
      } catch (error) {
        targetImg.dataset.trimmed = 'fail';
      }
    };
    workImg.onerror = () => {
      targetImg.dataset.trimmed = 'fail';
    };
    workImg.src = source;
  }

  function buildTrimmedIconDataUrl(img) {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return '';

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    sourceCtx.drawImage(img, 0, 0);

    const data = sourceCtx.getImageData(0, 0, width, height).data;
    const alphaThreshold = 8;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > alphaThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return '';

    const trimW = maxX - minX + 1;
    const trimH = maxY - minY + 1;
    const outputSize = 512;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const ctx = outputCanvas.getContext('2d');

    const scale = Math.max(outputSize / trimW, outputSize / trimH);
    const drawW = trimW * scale;
    const drawH = trimH * scale;
    const dx = (outputSize - drawW) / 2;
    const dy = 0;

    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.drawImage(sourceCanvas, minX, minY, trimW, trimH, dx, dy, drawW, drawH);
    return outputCanvas.toDataURL('image/png');
  }

  window.addEventListener('resize', alignDetailIconToProfileBottom);

  window.CharaLibraRender = {
    STATUS_LABELS,
    formatDate,
    statValue,
    renderGrid,
    renderMetrics,
    fillDetail,
    trimTransparentAvatars,
    alignDetailIconToProfileBottom,
    updateThemeSwatch,
    escapeHtml,
  };
})();
