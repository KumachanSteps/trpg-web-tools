(() => {
  async function fetchAndParse(externalUrl, options = {}) {
    const html = await fetchHtml(externalUrl, options);
    return window.IacharaParser.parseIacharaHtml(html);
  }

  async function fetchHtml(externalUrl, options = {}) {
    const target = validateIacharaUrl(externalUrl);
    const requestUrl = options.useProxy ? buildProxyUrl(options.proxyUrl, target) : target;
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7"
      }
    });
    if (!response.ok) throw new Error(`取得に失敗しました: HTTP ${response.status}`);
    return response.text();
  }

  function validateIacharaUrl(url) {
    let parsed;
    try {
      parsed = new URL(String(url || "").trim());
    } catch {
      throw new Error("externalUrlが正しいURLではありません");
    }
    if (!parsed.hostname.endsWith("iachara.com")) throw new Error("iachara.com のURLのみ取得できます");
    if (!parsed.pathname.startsWith("/view/")) throw new Error("/view/ 形式のいあキャラURLを指定してください");
    return parsed.toString();
  }

  function buildProxyUrl(proxyUrl, targetUrl) {
    const base = String(proxyUrl || "").trim();
    if (!base) throw new Error("Proxy URLを入力してください");
    return base.includes("{url}") ? base.replace("{url}", encodeURIComponent(targetUrl)) : base + encodeURIComponent(targetUrl);
  }

  window.IacharaFetcher = {
    fetchAndParse,
    fetchHtml,
    validateIacharaUrl,
    buildProxyUrl
  };
})();
