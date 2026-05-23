(() => {
  function parseIacharaHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ""), "text/html");
    const textMap = extractKeyValueText(doc);
    const jsonObjects = extractJsonObjectsFromHtml(doc, html);
    const flat = flattenJsonCandidates(jsonObjects);
    const meta = extractMetaInfo(doc);
    const profile = extractProfileFromSources(textMap, flat, meta);
    const weapons = extractListFromSources(textMap, flat, ["武器", "武器・防具", "防具", "weapon", "weapons", "arms"]);
    const items = extractListFromSources(textMap, flat, ["所持品", "持ち物", "装備", "item", "items", "belongings", "inventory"]);
    const memo = extractMemoFromSources(textMap, flat);
    const found = Boolean(profile.name || profile.occupation || profile.age || profile.gender || profile.height || profile.weight || profile.color || weapons.length || items.length || memo);
    return { found, profile, weapons, items, memo, meta };
  }

  function extractMetaInfo(doc) {
    const meta = {};
    const title = doc.querySelector("title")?.textContent?.trim();
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim();
    const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute("content")?.trim();
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content")?.trim();
    if (title) meta.title = title;
    if (ogTitle) meta.ogTitle = ogTitle;
    if (ogDescription) meta.ogDescription = ogDescription;
    if (ogImage) meta.ogImage = ogImage;
    return meta;
  }

  function extractKeyValueText(doc) {
    const map = new Map();
    doc.querySelectorAll("tr").forEach((row) => {
      const cells = Array.from(row.querySelectorAll("th,td")).map((cell) => cleanExtractedText(cell.textContent));
      if (cells.length >= 2 && cells[0] && cells[1]) setIfBetter(map, cells[0], cells.slice(1).join(" / "));
    });
    doc.querySelectorAll("dt").forEach((dt) => {
      const key = cleanExtractedText(dt.textContent);
      const value = cleanExtractedText(dt.nextElementSibling?.textContent || "");
      if (key && value) setIfBetter(map, key, value);
    });
    extractKeyValueFromLooseText(doc.body?.innerText || doc.body?.textContent || "").forEach(([key, value]) => setIfBetter(map, key, value));
    return map;
  }

  function extractKeyValueFromLooseText(rawText) {
    const text = cleanExtractedText(rawText);
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const pairs = [];
    const directKeys = ["名前", "職業", "年齢", "性別", "身長", "体重", "カラー", "色", "メモ", "キャラメモ", "所持品", "持ち物", "装備", "武器", "防具", "武器・防具"];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const colon = line.match(/^([^:：]{1,18})[:：]\s*(.+)$/);
      if (colon) {
        pairs.push([colon[1], colon[2]]);
        continue;
      }
      if (directKeys.includes(line) && lines[i + 1]) {
        pairs.push([line, collectSection(lines, i + 1, directKeys)]);
      }
    }
    return pairs;
  }

  function collectSection(lines, start, stopKeys) {
    const values = [];
    for (let i = start; i < lines.length; i += 1) {
      if (stopKeys.includes(lines[i])) break;
      values.push(lines[i]);
      if (values.join("\n").length > 1600) break;
    }
    return values.join("\n");
  }

  function setIfBetter(map, key, value) {
    const normalized = normalizeFieldKey(key);
    const clean = cleanupValue(value);
    if (!normalized || !clean) return;
    const current = map.get(normalized);
    if (!current || clean.length > current.length) map.set(normalized, clean);
  }

  function extractJsonObjectsFromHtml(doc, html) {
    const objects = [];
    doc.querySelectorAll('script[type="application/json"], script#__NEXT_DATA__, script').forEach((script) => {
      const text = script.textContent?.trim();
      if (!text) return;
      const parsed = tryParseJson(text);
      if (parsed) objects.push(parsed);
      extractLikelyJsonAssignments(text).forEach((value) => objects.push(value));
    });
    extractLikelyJsonAssignments(String(html || "")).forEach((value) => objects.push(value));
    return objects;
  }

  function tryParseJson(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  function extractLikelyJsonAssignments(text) {
    const results = [];
    const names = ["window.__NUXT__", "window.__INITIAL_STATE__", "__INITIAL_STATE__", "__NUXT__"];
    for (const name of names) {
      let index = text.indexOf(name);
      while (index >= 0) {
        const eq = text.indexOf("=", index);
        if (eq < 0) break;
        const start = text.indexOf("{", eq);
        if (start < 0) break;
        const fragment = readBalancedJsonObject(text, start);
        const parsed = fragment ? tryParseJson(fragment) : null;
        if (parsed) results.push(parsed);
        index = text.indexOf(name, start + 1);
      }
    }
    return results;
  }

  function readBalancedJsonObject(text, start) {
    let depth = 0;
    let inString = false;
    let quote = "";
    let escaped = false;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === quote) inString = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = true;
        quote = ch;
        continue;
      }
      if (ch === "{") depth += 1;
      if (ch === "}") depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
    return "";
  }

  function flattenJsonCandidates(objects) {
    const flat = [];
    const visited = new WeakSet();
    function walk(value, path = "") {
      if (value === null || value === undefined) return;
      if (typeof value !== "object") {
        flat.push({ path, key: path.split(".").pop() || "", value: String(value) });
        return;
      }
      if (visited.has(value)) return;
      visited.add(value);
      if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }
      Object.entries(value).forEach(([key, child]) => walk(child, path ? `${path}.${key}` : key));
    }
    objects.forEach((object) => walk(object));
    return flat.filter((entry) => entry.value && entry.value !== "[object Object]");
  }

  function extractProfileFromSources(textMap, flat, meta) {
    const profile = {
      name: pickField(textMap, flat, ["名前", "name", "characterName", "pcName"]) || guessNameFromMeta(meta),
      occupation: pickField(textMap, flat, ["職業", "occupation", "job", "career"]),
      age: pickField(textMap, flat, ["年齢", "age"]),
      gender: pickField(textMap, flat, ["性別", "gender", "sex"]),
      height: pickField(textMap, flat, ["身長", "height", "stature"]),
      weight: pickField(textMap, flat, ["体重", "weight"]),
      color: pickField(textMap, flat, ["カラー", "色", "color", "colour"]),
    };
    if (!profile.color) {
      const colorHit = flat.find((entry) => /^#[0-9a-fA-F]{6,8}$/.test(entry.value));
      if (colorHit) profile.color = colorHit.value;
    }
    return profile;
  }

  function pickField(textMap, flat, keys) {
    for (const key of keys) {
      const normalized = normalizeFieldKey(key);
      if (textMap.has(normalized)) return cleanupValue(textMap.get(normalized));
    }
    const candidates = flat.filter((entry) => {
      const haystack = normalizeFieldKey(`${entry.path}.${entry.key}`);
      return keys.some((key) => haystack.includes(normalizeFieldKey(key)));
    });
    const best = candidates.find((entry) => isUsefulScalar(entry.value));
    return best ? cleanupValue(best.value) : "";
  }

  function extractListFromSources(textMap, flat, keys) {
    const raw = pickField(textMap, flat, keys);
    if (raw) return splitListText(raw);
    const candidates = flat
      .filter((entry) => keys.some((key) => normalizeFieldKey(`${entry.path}.${entry.key}`).includes(normalizeFieldKey(key))))
      .map((entry) => cleanupValue(entry.value))
      .filter(isUsefulScalar);
    return uniqueStrings(candidates.flatMap(splitListText)).slice(0, 30);
  }

  function extractMemoFromSources(textMap, flat) {
    const raw = pickField(textMap, flat, ["メモ", "キャラメモ", "人物メモ", "note", "memo", "description", "backstory", "profile"]);
    if (raw) return raw;
    const description = flat.find((entry) => /description|memo|note|backstory|profile/i.test(entry.path) && entry.value.length > 20);
    return description ? cleanupValue(description.value) : "";
  }

  function buildProfileMemoFromIachara(scraped, baseData) {
    const profile = scraped?.profile || {};
    return [
      `名前: ${profile.name || baseData?.name || ""}`,
      `職業: ${profile.occupation || "未取得"}`,
      `年齢: ${profile.age || "未取得"} / 性別: ${profile.gender || "未取得"}`,
      `身長: ${profile.height || "未取得"} / 体重: ${profile.weight || "未取得"}`,
      `カラーコード: ${profile.color || baseData?.color || "未取得"}`,
    ].join("\n");
  }

  function buildListSection(title, values, fallback) {
    const list = Array.isArray(values) ? values.filter(Boolean) : [];
    if (!list.length) return `【${title}】\n${fallback}`;
    return `【${title}】\n${list.join("\n")}`;
  }

  function splitListText(text) {
    return cleanExtractedText(text)
      .split(/\n|、|,|\/|・/)
      .map((item) => cleanupValue(item))
      .filter((item) => item.length > 0 && item.length < 160);
  }

  function cleanExtractedText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function cleanupValue(value) {
    return cleanExtractedText(value)
      .replace(/^[:：]/, "")
      .replace(/^[\-–—・●■□◆◇]+/, "")
      .trim();
  }

  function normalizeFieldKey(key) {
    return String(key || "")
      .toLowerCase()
      .replace(/[\s\n\r\t:：＿_\-‐–—()（）［］\[\]【】]/g, "")
      .trim();
  }

  function isUsefulScalar(value) {
    const text = cleanupValue(value);
    if (!text) return false;
    if (["true", "false", "null", "undefined"].includes(text)) return false;
    if (text.length > 2000) return false;
    return true;
  }

  function uniqueStrings(values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
      const text = cleanupValue(value);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      result.push(text);
    }
    return result;
  }

  function guessNameFromMeta(meta) {
    const title = meta?.ogTitle || meta?.title || "";
    if (!title) return "";
    return title.replace(/\s*[-|｜].*$/, "").replace(/いあきゃら|いあキャラ/g, "").trim();
  }

  window.IacharaParser = {
    parseIacharaHtml,
    buildProfileMemoFromIachara,
    buildListSection
  };
})();
