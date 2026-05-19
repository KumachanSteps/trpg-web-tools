function parseSessionReportInput(text = '') {
  return {
    raw: text,
    lines: String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  };
}
