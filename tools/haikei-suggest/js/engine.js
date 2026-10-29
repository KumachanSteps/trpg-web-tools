/* TRPG背景サジェスト — 解析とサジェストの計算（画面に依存しない部分）
 * ・ファイル名・フォルダ名からのタグ推定
 * ・画像の色解析（明るさ・色味）
 * ・本文のシーン分割と、シーンごとのタグ抽出
 * ・タグの一致度による背景のスコア付け */
(function (global) {
  'use strict';

  const { CATEGORIES, TAGS } = global.HaikeiVocab;
  const TAG_BY_ID = new Map(TAGS.map((tag) => [tag.id, tag]));
  const CAT_WEIGHT = new Map(CATEGORIES.map((cat) => [cat.id, cat.weight]));
  const HINT_SCORE = 0.35;
  const PATH_WORD_SCORE = 0.8;
  const MIN_COLOR_ONLY = 20;
  const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|bmp)$/i;

  const isLatin = (word) => /^[\x20-\x7e]+$/.test(word);
  const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // ラテン文字の語句は単語の区切りで照合する（"bar" が "barrel" に当たらないように）。
  // 数字や _ - は区切りとして扱う。複数形の s も許す。
  function latinMatcher(word) {
    return new RegExp('(?:^|[^a-z])' + escapeRe(word.toLowerCase()) + 's?(?=$|[^a-z])', 'g');
  }

  function compileWords(words) {
    return words.map((word) => (isLatin(word)
      ? { word, re: latinMatcher(word) }
      : { word, text: word.toLowerCase() }));
  }

  // 1つのタグ辞書（組み込み＋マイタグ）を照合用にまとめる
  function buildMatcher(customTags) {
    const entries = TAGS.map((tag) => ({
      id: tag.id,
      cat: tag.cat,
      hints: tag.hints,
      text: compileWords(tag.words),
      file: compileWords(tag.words.concat(tag.fileWords))
    }));
    (customTags || []).forEach((tag) => {
      const words = [tag.label].concat(tag.words || []).filter((word) => word && word.trim());
      const compiled = compileWords(words.map((word) => word.trim()));
      entries.push({ id: tag.id, cat: 'custom', hints: [], text: compiled, file: compiled });
    });
    return entries;
  }

  function countIn(haystack, compiled) {
    let count = 0;
    const hits = [];
    compiled.forEach((item) => {
      let n = 0;
      if (item.re) {
        item.re.lastIndex = 0;
        while (item.re.exec(haystack)) n += 1;
      } else {
        let from = 0;
        for (;;) {
          const at = haystack.indexOf(item.text, from);
          if (at < 0) break;
          n += 1;
          from = at + item.text.length;
        }
      }
      if (n) { count += n; hits.push(item.word); }
    });
    return { count, hits };
  }

  // ファイルの相対パス（拡張子なし）からタグを推定する
  function tagsFromPath(path, matcher) {
    const plain = path.replace(IMAGE_EXT, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase();
    const found = [];
    matcher.forEach((entry) => {
      if (entry.cat === 'custom') return; // マイタグは本人が付けたものだけ
      if (countIn(plain, entry.file).count) found.push(entry.id);
    });
    return found;
  }

  // パスから、本文との直接照合に使う語（2文字以上の漢字かな・3文字以上の英字）を拾う
  function pathWords(path) {
    const plain = path.replace(IMAGE_EXT, '').replace(/([a-z])([A-Z])/g, '$1 $2');
    const parts = plain.split(/[\\/_\-\s.・,，、()（）[\]【】「」]+|\d+/).filter(Boolean);
    const words = new Set();
    parts.forEach((part) => {
      if (/^[a-z]+$/i.test(part)) {
        if (part.length >= 3) words.add(part.toLowerCase());
      } else if (part.length >= 2) {
        words.add(part.toLowerCase());
      }
    });
    return Array.from(words);
  }

  // ---------- 色解析 ----------

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }

  // 色相の区分（度）。彩度の高い画素だけを数える
  const HUE_BINS = [
    ['tone.red', 345, 15], ['tone.orange', 15, 42], ['tone.yellow', 42, 68],
    ['tone.green', 68, 165], ['tone.blue', 165, 255], ['tone.purple', 255, 300], ['tone.pink', 300, 345]
  ];

  function hueBin(h) {
    for (const [id, from, to] of HUE_BINS) {
      if (from > to ? (h >= from || h < to) : (h >= from && h < to)) return id;
    }
    return 'tone.red';
  }

  // RGBA の画素配列から明るさ・彩度・色の割合を求める
  function analyzePixels(data) {
    let n = 0;
    let lumSum = 0;
    let satSum = 0;
    let dark = 0;
    let bright = 0;
    let colorful = 0;
    const bins = {};
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 32) continue;
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      n += 1;
      lumSum += lum;
      satSum += s;
      if (lum < 0.2) dark += 1;
      if (lum > 0.7) bright += 1;
      if (s > 0.25 && l > 0.12 && l < 0.9) {
        colorful += 1;
        const bin = hueBin(h);
        bins[bin] = (bins[bin] || 0) + 1;
      }
    }
    if (!n) return null;
    const share = {};
    Object.keys(bins).forEach((id) => { share[id] = Math.round((bins[id] / n) * 1000) / 1000; });
    return {
      lum: Math.round((lumSum / n) * 1000) / 1000,
      sat: Math.round((satSum / n) * 1000) / 1000,
      dark: Math.round((dark / n) * 1000) / 1000,
      bright: Math.round((bright / n) * 1000) / 1000,
      colorful: Math.round((colorful / n) * 1000) / 1000,
      hues: share
    };
  }

  // 色解析の数値から色・明るさタグを決める
  function tagsFromColor(color) {
    if (!color) return [];
    const tags = [];
    if (color.lum < 0.24 || color.dark > 0.55) tags.push('tone.dark');
    else if (color.lum > 0.62 && color.dark < 0.15) tags.push('tone.bright');
    if (color.sat < 0.1 || color.colorful < 0.04) {
      tags.push('tone.mono');
      return tags;
    }
    Object.entries(color.hues)
      .filter(([, value]) => value >= 0.16)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .forEach(([id]) => tags.push(id));
    return tags;
  }

  // ---------- シーン分割 ----------

  const HEADING_RE = /^\s*(?:#{1,6}\s|[■□◆◇●○▼▽★☆◎▶►※]|【[^】]{1,40}】\s*$|〈[^〉]{1,40}〉\s*$|第[0-9０-９一二三四五六七八九十百]+[章節話幕場]|(?:シーン|場面|scene|chapter|씬|장면)\s*[0-9０-９]*\s*[:：.．\-]?|[0-9０-９]{1,2}[.．、)）]\s*\S.{0,30}$|-{3,}\s*$|={3,}\s*$|\*{3,}\s*$)/i;

  function splitScenes(text, mode) {
    const clean = (text || '').replace(/\r\n?/g, '\n').trim();
    if (!clean) return [];
    if (mode === 'whole') return [makeScene(clean, 0)];
    const lines = clean.split('\n');
    const blocks = [];
    let current = [];
    const push = () => {
      const body = current.join('\n').trim();
      if (body) blocks.push(body);
      current = [];
    };
    if (mode === 'heading' && lines.some((line) => HEADING_RE.test(line))) {
      lines.forEach((line) => {
        if (HEADING_RE.test(line) && current.join('').trim()) push();
        current.push(line);
      });
      push();
    } else {
      // 段落（空行区切り）
      lines.forEach((line) => {
        if (!line.trim()) push();
        else current.push(line);
      });
      push();
    }
    // 短すぎる塊は次の塊にまとめる（見出しだけの行など）
    const merged = [];
    let carry = '';
    blocks.forEach((block) => {
      const body = carry ? carry + '\n' + block : block;
      if (body.replace(/\s/g, '').length < 12) { carry = body; return; }
      merged.push(body);
      carry = '';
    });
    if (carry) {
      if (merged.length) merged[merged.length - 1] += '\n' + carry;
      else merged.push(carry);
    }
    return merged.map((body, index) => makeScene(body, index));
  }

  function makeScene(body, index) {
    const first = body.split('\n').find((line) => line.trim()) || '';
    const title = first.trim().replace(/^#{1,6}\s*/, '').slice(0, 40);
    return { index, title, body };
  }

  // ---------- 本文のタグ抽出 ----------

  function tagsFromText(text, matcher) {
    const haystack = (text || '').toLowerCase();
    const result = [];
    matcher.forEach((entry) => {
      const { count, hits } = countIn(haystack, entry.text);
      if (!count) return;
      result.push({
        id: entry.id,
        count,
        hits,
        weight: (1 + Math.log2(count)) * (CAT_WEIGHT.get(entry.cat) || 1),
        hints: entry.hints
      });
    });
    return result.sort((a, b) => b.weight - a.weight);
  }

  // ---------- スコア付け ----------
  // images: [{ path, tags: Set<string>, words: string[] }]
  function rankImages(sceneTags, sceneText, images, limit) {
    const haystack = (sceneText || '').toLowerCase();
    const maxScore = sceneTags.reduce((sum, tag) => sum + tag.weight, 0) || 1;
    const scored = [];
    images.forEach((image) => {
      let score = 0;
      const matched = [];
      const partial = [];
      sceneTags.forEach((tag) => {
        if (image.tags.has(tag.id)) {
          score += tag.weight;
          matched.push(tag.id);
        } else if (tag.hints.some((hint) => image.tags.has(hint))) {
          score += tag.weight * HINT_SCORE;
          partial.push(tag.id);
        }
      });
      const words = image.words.filter((word) => haystack.includes(word));
      if (words.length) score += PATH_WORD_SCORE * Math.min(words.length, 3);
      if (score <= 0) return;
      const percent = Math.min(100, Math.round((score / maxScore) * 100));
      // 色が近いだけの候補は、ある程度近いときだけ出す
      if (!matched.length && !words.length && percent < MIN_COLOR_ONLY) return;
      scored.push({
        path: image.path,
        score,
        percent,
        matched,
        partial,
        words
      });
    });
    scored.sort((a, b) => (b.score - a.score) || (b.matched.length - a.matched.length) || a.path.localeCompare(b.path));
    return scored.slice(0, limit || 12);
  }

  global.HaikeiEngine = {
    TAG_BY_ID,
    IMAGE_EXT,
    buildMatcher,
    tagsFromPath,
    pathWords,
    analyzePixels,
    tagsFromColor,
    splitScenes,
    tagsFromText,
    rankImages
  };
})(window);
