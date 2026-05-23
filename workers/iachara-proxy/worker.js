const ALLOWED_HOSTS = new Set(["iachara.com", "www.iachara.com"]);

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return handleOptions();

    const requestUrl = new URL(request.url);
    const target = requestUrl.searchParams.get("url");
    if (!target) return corsResponse("Missing url", 400, "text/plain; charset=utf-8");

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return corsResponse("Invalid url", 400, "text/plain; charset=utf-8");
    }

    if (!ALLOWED_HOSTS.has(targetUrl.hostname) || !targetUrl.pathname.startsWith("/view/")) {
      return corsResponse("Forbidden", 403, "text/plain; charset=utf-8");
    }

    const upstream = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TRPGCharamemoFetcher/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    const body = await upstream.text();
    return corsResponse(body, upstream.status, upstream.headers.get("content-type") || "text/html; charset=utf-8");
  }
};

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders("text/plain; charset=utf-8")
  });
}

function corsResponse(body, status, contentType) {
  return new Response(body, {
    status,
    headers: corsHeaders(contentType)
  });
}

function corsHeaders(contentType) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  };
}
