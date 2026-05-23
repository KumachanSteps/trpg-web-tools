const ALLOWED_HOSTS = new Set([
  "iachara.com",
  "www.iachara.com",
  "apiv3.iachara.com"
]);

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders("text/plain; charset=utf-8")
      });
    }

    try {
      const requestUrl = new URL(request.url);
      const target = requestUrl.searchParams.get("url");
      const debug = requestUrl.searchParams.get("debug") === "1";

      if (!target) {
        return corsResponse("Missing url", 400, "text/plain; charset=utf-8");
      }

      let targetUrl;
      try {
        targetUrl = new URL(target);
      } catch {
        return corsResponse("Invalid url", 400, "text/plain; charset=utf-8");
      }

      if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
        return corsResponse(
          "Forbidden host: " + targetUrl.hostname,
          403,
          "text/plain; charset=utf-8"
        );
      }

      if (!isAllowedPath(targetUrl.hostname, targetUrl.pathname)) {
        return corsResponse(
          "Forbidden path: " + targetUrl.pathname,
          403,
          "text/plain; charset=utf-8"
        );
      }

      const upstream = await fetch(targetUrl.toString(), {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en-US;q=0.9,en;q=0.8"
        }
      });

      const body = await upstream.text();
      const contentType =
        upstream.headers.get("content-type") || "text/plain; charset=utf-8";

      if (debug) {
        return corsResponse(
          JSON.stringify(
            {
              ok: upstream.ok,
              status: upstream.status,
              statusText: upstream.statusText,
              url: targetUrl.toString(),
              contentType,
              bodyLength: body.length,
              bodyPreview: body.slice(0, 3000)
            },
            null,
            2
          ),
          200,
          "application/json; charset=utf-8"
        );
      }

      return corsResponse(body, upstream.status, contentType);
    } catch (error) {
      return corsResponse(
        error instanceof Error ? error.message : "Proxy fetch failed",
        502,
        "text/plain; charset=utf-8"
      );
    }
  }
};

function isAllowedPath(hostname, pathname) {
  if (hostname === "apiv3.iachara.com") {
    return (
      pathname.startsWith("/v3/charasheet/") ||
      pathname === "/v3/user/charasheet"
    );
  }

  if (hostname === "iachara.com" || hostname === "www.iachara.com") {
    return (
      pathname.startsWith("/view/") ||
      pathname.startsWith("/_next/static/")
    );
  }

  return false;
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
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    "Access-Control-Max-Age": "86400",
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}