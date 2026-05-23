const ALLOWED_HOSTS = new Set([
  "iachara.com",
  "www.iachara.com"
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

      if (!targetUrl.pathname.startsWith("/view/")) {
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
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
          "Accept-Language": "ja,en-US;q=0.9,en;q=0.8"
        }
      });

      const body = await upstream.text();
      const contentType =
        upstream.headers.get("content-type") || "text/html; charset=utf-8";

      if (debug) {
        const scriptSrcs = extractScriptSrcs(body);
        const nextDataRaw = extractNextDataRaw(body);
        const nextData = parseNextData(nextDataRaw);

        return corsResponse(
          JSON.stringify(
            {
              ok: upstream.ok,
              status: upstream.status,
              statusText: upstream.statusText,
              url: targetUrl.toString(),
              contentType,
              bodyLength: body.length,
              hasNextData: Boolean(nextDataRaw),
              nextData,
              scriptSrcs,
              bodyStart: body.slice(0, 1200),
              bodyEnd: body.slice(-1200)
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

function extractScriptSrcs(html) {
  const result = [];
  const pattern = /<script[^>]+src=["']([^"']+)["']/g;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    result.push(match[1]);
  }

  return result;
}

function extractNextDataRaw(html) {
  const pattern =
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/;
  const match = html.match(pattern);

  if (match && match[1]) {
    return decodeHtmlEntities(match[1]);
  }

  return "";
}

function parseNextData(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw.slice(0, 2000);
  }
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
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
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}