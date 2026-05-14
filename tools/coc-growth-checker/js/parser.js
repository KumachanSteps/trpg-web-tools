window.CocDiceParser = (() => {
  const COMMAND_PATTERN = String.raw`(?:s?CCB?|s?RESB|s?CBRB|CBRB|RESB|CCB|CC)`;
  const COMMAND_REGEX = new RegExp(String.raw`\b${COMMAND_PATTERN}\b`, "i");
  const D100_REGEX = /(?:1D100|D100|1d100|d100)/i;

  const SYSTEM_CHANNELS_TO_IGNORE = new Set([
    "雑談",
    "other",
    "info"
  ]);

  const PARAM_SKILLS = new Set([
    "アイデア",
    "知識",
    "幸運",
    "STR",
    "CON",
    "POW",
    "DEX",
    "APP",
    "SIZ",
    "INT",
    "EDU",
    "STR×5",
    "CON×5",
    "POW×5",
    "DEX×5",
    "APP×5",
    "SIZ×5",
    "INT×5",
    "EDU×5",
    "STR*5",
    "CON*5",
    "POW*5",
    "DEX*5",
    "APP*5",
    "SIZ*5",
    "INT*5",
    "EDU*5",
    "IDEA",
    "KNOW",
    "KNOWLEDGE",
    "LUCK"
  ]);

  function parse(rawInput) {
    const lines = extractLines(rawInput);
    const rolls = [];

    lines.forEach((line, index) => {
      const normalized = normalizeLine(line);
      if (!normalized) return;
      if (!containsDiceRoll(normalized)) return;
      if (shouldIgnoreChannel(normalized)) return;

      const parsedLineRolls = parseLine(normalized, index + 1);
      rolls.push(...parsedLineRolls);
    });

    return rolls;
  }

  function extractLines(rawInput) {
    if (!rawInput) return [];

    const input = String(rawInput);

    if (/<(?:html|body|p|div|span|br|table|tr|td)\b/i.test(input)) {
      return extractLinesFromHtml(input);
    }

    return input
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  }

  function extractLinesFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const rowSelectors = [
      "p",
      "div.MuiListItemText-root",
      "div[class*='message']",
      "li",
      "tr"
    ];

    const rows = [];

    for (const selector of rowSelectors) {
      doc.querySelectorAll(selector).forEach(node => {
        const text = normalizeLine(node.textContent || "");
        if (text && containsDiceRoll(text)) rows.push(text);
      });

      if (rows.length) break;
    }

    if (!rows.length) {
      const text = doc.body ? doc.body.textContent || "" : html;
      return text
        .replace(/\u00a0/g, " ")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    }

    return rows;
  }

  function normalizeLine(line) {
    return String(line || "")
      .replace(/\u00a0/g, " ")
      .replace(/[：]/g, ":")
      .replace(/[＜]/g, "<")
      .replace(/[＝]/g, "=")
      .replace(/[（]/g, "(")
      .replace(/[）]/g, ")")
      .replace(/[＞]/g, ">")
      .replace(/[［]/g, "[")
      .replace(/[］]/g, "]")
      .replace(/\s+/g, " ")
      .trim();
  }

  function containsDiceRoll(line) {
    return COMMAND_REGEX.test(line) || D100_REGEX.test(line);
  }

  function shouldIgnoreChannel(line) {
    const channelMatch = line.match(/^\[([^\]]+)\]/);
    if (!channelMatch) return false;

    const channel = channelMatch[1].trim();
    return SYSTEM_CHANNELS_TO_IGNORE.has(channel);
  }

  function parseLine(line, lineNo) {
    const character = extractCharacter(line);
    if (!character) return [];

    const skill = extractSkill(line);
    const chunks = extractRollChunks(line);

    return chunks.map((chunk, chunkIndex) => {
      const result = detectResult(chunk.text, chunk.rollValue);

      return {
        id: `${lineNo}-${chunkIndex}`,
        lineNo,
        character,
        skill,
        rollValue: chunk.rollValue,
        result,
        raw: line,
        rawChunk: chunk.text,
        isSan: isSanSkill(skill, line),
        isParam: isParameterSkill(skill),
        isLuckCritical: result === "critical" && /幸運|LUCK/i.test(skill)
      };
    }).filter(roll => {
      return ["critical", "fumble", "special", "success", "failure"].includes(roll.result);
    });
  }

  function extractCharacter(line) {
    const channelRemoved = line.replace(/^\[[^\]]+\]\s*/, "").trim();

    const diceIndex = findFirstDiceIndex(channelRemoved);
    if (diceIndex < 0) return null;

    const beforeDice = channelRemoved.slice(0, diceIndex);
    const colonIndex = Math.max(
      beforeDice.lastIndexOf(":"),
      beforeDice.lastIndexOf("：")
    );

    if (colonIndex < 0) return null;

    let character = beforeDice.slice(0, colonIndex).trim();

    character = character
      .replace(/^[\s\-–—・]+/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!character) return null;
    if (character.length > 80) return null;
    if (/^(system|info|ルール|メモ|成功|失敗|クリティカル|ファンブル)$/i.test(character)) return null;

    return character;
  }

  function findFirstDiceIndex(line) {
    const commandMatch = line.match(COMMAND_REGEX);
    const d100Match = line.match(D100_REGEX);

    const indexes = [];

    if (commandMatch) indexes.push(commandMatch.index);
    if (d100Match) indexes.push(d100Match.index);

    if (!indexes.length) return -1;

    return Math.min(...indexes);
  }

  function extractSkill(line) {
    const bracketSkills = [...line.matchAll(/【([^】]+)】/g)]
      .map(match => cleanSkillName(match[1]))
      .filter(Boolean);

    if (bracketSkills.length) {
      return bracketSkills[bracketSkills.length - 1];
    }

    const sanSkill = inferSanSkill(line);
    if (sanSkill) return sanSkill;

    const parameterSkill = inferParameterSkill(line);
    if (parameterSkill) return parameterSkill;

    const commandSkill = inferSkillAfterCommand(line);
    if (commandSkill) return commandSkill;

    return "未設定技能";
  }

  function cleanSkillName(skill) {
    return String(skill || "")
      .replace(/[:：].*$/, "")
      .replace(/\s+/g, " ")
      .replace(/^[\[\]【】\s]+|[\[\]【】\s]+$/g, "")
      .trim();
  }

  function inferSanSkill(line) {
    if (/SAN|SANC|正気度|正気度ロール|SAN値|SANチェック/i.test(line)) {
      return "正気度ロール";
    }

    return "";
  }

  function inferParameterSkill(line) {
    if (/アイデア/i.test(line)) return "アイデア";
    if (/知識|KNOWLEDGE|KNOW/i.test(line)) return "知識";
    if (/幸運|LUCK/i.test(line)) return "幸運";

    const abilityMatch = line.match(/\b(STR|CON|POW|DEX|APP|SIZ|INT|EDU)\b(?:\s*[×xX*]\s*\d+)?/i);
    if (abilityMatch) return abilityMatch[0].toUpperCase().replace(/\s+/g, "");

    return "";
  }

  function inferSkillAfterCommand(line) {
    const commandMatch = line.match(COMMAND_REGEX);
    if (!commandMatch) return "";

    const afterCommand = line.slice(commandMatch.index + commandMatch[0].length);

    const candidate = afterCommand
      .replace(/^\s*(?:\([^)]*\)|<=\s*\d+|[<>=\d+\-*/×x\s]+)*/, "")
      .split(/[>]/)[0]
      .replace(/#\d+.*$/, "")
      .replace(/\(1D100.*$/i, "")
      .trim();

    return cleanSkillName(candidate);
  }

  function extractRollChunks(line) {
    const chunks = [];
    const explicitRollRegex = /(?:#\d+\s*)?(?:\((?:1D100|D100)\s*(?:<=\s*\d+)?\)|(?:1D100|D100)\s*(?:<=\s*\d+)?)\s*>\s*(\d{1,3})\s*>\s*([^#]+)/gi;

    let match;
    while ((match = explicitRollRegex.exec(line)) !== null) {
      const rollValue = Number(match[1]);
      if (!isValidD100(rollValue)) continue;

      chunks.push({
        rollValue,
        text: match[0].trim()
      });
    }

    if (chunks.length) return chunks;

    const simpleArrowRegex = />\s*(\d{1,3})\s*>\s*([^#]+)/g;
    while ((match = simpleArrowRegex.exec(line)) !== null) {
      const rollValue = Number(match[1]);
      if (!isValidD100(rollValue)) continue;

      chunks.push({
        rollValue,
        text: match[0].trim()
      });
    }

    if (chunks.length) return chunks;

    const fallbackRollMatch = line.match(/(?:1D100|D100|1d100|d100)\s*(?:<=\s*\d+)?\D+(\d{1,3})/);
    if (fallbackRollMatch) {
      const rollValue = Number(fallbackRollMatch[1]);
      if (isValidD100(rollValue)) {
        return [{
          rollValue,
          text: line
        }];
      }
    }

    return [];
  }

  function isValidD100(value) {
    return Number.isInteger(value) && value >= 1 && value <= 100;
  }

  function detectResult(text, rollValue) {
    const upper = text.toUpperCase();

    if (/決定的成功|クリティカル|CRITICAL|C決定的/.test(text) || /\bCRIT\b/.test(upper)) {
      return "critical";
    }

    if (/致命的失敗|ファンブル|FUMBLE/.test(text) || /\bFUMBLE\b/.test(upper)) {
      return "fumble";
    }

    if (/スペシャル|SPECIAL/.test(text)) {
      return "special";
    }

    if (/成功|SUCCESS/.test(text)) {
      return "success";
    }

    if (/失敗|FAILURE|FAILED/.test(text)) {
      return "failure";
    }

    if (rollValue !== null && rollValue !== undefined) {
      if (rollValue <= 5) return "critical";
      if (rollValue >= 96) return "fumble";
    }

    return "unknown";
  }

  function isSanSkill(skill, line) {
    return /SAN|SANC|正気度|正気度ロール|SAN値|SANチェック/i.test(`${skill} ${line}`);
  }

  function isParameterSkill(skill) {
    const normalized = String(skill || "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .trim();

    const jp = String(skill || "").trim();

    if (PARAM_SKILLS.has(jp)) return true;
    if (PARAM_SKILLS.has(normalized)) return true;
    if (/^(STR|CON|POW|DEX|APP|SIZ|INT|EDU)(?:[×X*]\d+)?$/.test(normalized)) return true;
    if (/^(アイデア|知識|幸運)$/.test(jp)) return true;

    return false;
  }

  return {
    parse,
    normalizeLine,
    containsDiceRoll
  };
})();