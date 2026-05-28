function parseSourceText(rawText) {
  let text = rawText || "";
  text = text.replace(/
/g, "
").replace(//g, "
");
  text = text.replace(/
{3,}/g, "

");
  return text.trim();
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
