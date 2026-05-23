function parseSourceText(rawText) {
  let text = rawText || "";

  if (document.getElementById("normalizeFullWidthSpaces").checked) {
    text = text.replace(/　/g, " ");
  }

  if (document.getElementById("trimLineSpaces").checked) {
    text = text
      .split("\n")
      .map(line => line.trim())
      .join("\n");
  }

  if (document.getElementById("mergePdfLines").checked) {
    text = mergeBrokenLines(text);
  }

  if (document.getElementById("removeBlankLines").checked) {
    text = text.replace(/\n{3,}/g, "\n\n");
  }

  if (!document.getElementById("keepLineBreaks").checked) {
    text = text.replace(/\n+/g, " ");
  }

  if (document.getElementById("splitByBlankLines").checked) {
    text = text
      .split(/\n\s*\n/)
      .map((block, index) => `【Block ${index + 1}】\n${block.trim()}`)
      .join("\n\n");
  }

  return text;
}

function mergeBrokenLines(text) {
  const lines = text.split("\n");
  const merged = [];

  for (const line of lines) {
    const current = line.trim();

    if (!current) {
      merged.push("");
      continue;
    }

    const prev = merged[merged.length - 1];
    const shouldMerge =
      prev &&
      !/[。！？.!?」』）)]$/.test(prev) &&
      !/^#|^◆|^▼|^■|^●|^◎|^〓|^△|^❖|^※|^☆|^◈/.test(current);

    if (shouldMerge) {
      merged[merged.length - 1] = prev + current;
    } else {
      merged.push(current);
    }
  }

  return merged.join("\n");
}

function splitSelectionIntoTitleAndBody(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const firstLineIndex = lines.findIndex(line => line.trim());

  if (firstLineIndex === -1) {
    return { title: "", body: "" };
  }

  return {
    title: lines[firstLineIndex].trim().slice(0, 80),
    body: lines.slice(firstLineIndex + 1).join("\n").trim()
  };
}
