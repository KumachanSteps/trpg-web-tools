(function () {
  function formatDateForXSearch(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getRelativeSinceQuery(filter) {
    const date = new Date();
    if (filter === "since:1day") date.setDate(date.getDate() - 1);
    if (filter === "since:3days") date.setDate(date.getDate() - 3);
    if (filter === "since:1week") date.setDate(date.getDate() - 7);
    if (filter === "since:1month") date.setMonth(date.getMonth() - 1);
    return `since:${formatDateForXSearch(date)}`;
  }

  function buildXSearchUrl(query, latest = false) {
    const mode = latest ? "&f=live" : "";
    return `https://x.com/search?q=${encodeURIComponent(query)}${mode}&src=typed_query`;
  }

  async function copyTextToClipboard(text) {
    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      try {
        return document.execCommand("copy");
      } finally {
        document.body.removeChild(textarea);
      }
    };

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      return fallbackCopy();
    }
    return fallbackCopy();
  }

  window.HashtagParser = { formatDateForXSearch, getRelativeSinceQuery, buildXSearchUrl, copyTextToClipboard };
})();
