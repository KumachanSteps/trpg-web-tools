const ALLOWED_HOSTS = new Set([
  "apiv3.iachara.com",
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
      const scan = requestUrl.searchParams.get("scan") === "1";
      const deep = requestUrl.searchParams.get("deep") === "1";

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
        return corsResponse("Forbidden host: " + targetUrl.hostname, 403, "text/plain; charset=utf-8");
      }

      if (!isAllowedPath(targetUrl.pathname)) {
        return corsResponse("Forbidden path: " + targetUrl.pathname, 403, "text/plain; charset=utf-8");
      }

      const upstream = await fetch(targetUrl.toString(), {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
          "Accept-Language": "ja,en-US;q=0.9,en;q=0.8"
        }
      });

      const body = await upstream.text();
      const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8";

      if (deep) {
        const scriptSrcs = extractScriptSrcs(body);
        const absoluteScriptUrls = scriptSrcs.map((src) => new URL(src, targetUrl.origin).toString());
        const results = [];

        for (const scriptUrl of absoluteScriptUrls) {
          if (!scriptUrl.includes("/_next/static/")) continue;

          const scriptResponse = await fetch(scriptUrl, {
            method: "GET",
            redirect: "follow",
            headers: {
              "User-Agent": "Mozilla/5.0",
              "Accept": "application/javascript,text/javascript,*/*"
            }
          });

          const scriptText = await scriptResponse.text();

          results.push({
            url: scriptUrl,
            status: scriptResponse.status,
            length: scriptText.length,
            hits: extractDeepHits(scriptText, [
              "getCharasheet",
              "saveCharasheet",
              "createCharasheet",
              "viewCharasheet",
              "api is not initialized",
              "initializeApp",
              "apiKey",
              "projectId",
              "firestore",
              "collection",
              "doc(",
              "getDoc",
              "getDocs",
              "charasheet",
              "charasheets",
              "characters",
              "profile",
              "profession",
              "belongings",
              "battle",
              "additionalMemo"
            ])
          });
        }

        return corsResponse(
          JSON.stringify(
            {
              ok: upstream.ok,
              status: upstream.status,
              url: targetUrl.toString(),
              bodyLength: body.length,
              scriptCount: scriptSrcs.length,
              results
            },
            null,
            2
          ),
          200,
          "application/json; charset=utf-8"
        );
      }

      if (scan) {
        const scriptSrcs = extractScriptSrcs(body);
        const absoluteScriptUrls = scriptSrcs.map((src) => new URL(src, targetUrl.origin).toString());
        const chunkResults = [];

        for (const scriptUrl of absoluteScriptUrls) {
          if (!scriptUrl.includes("/_next/static/")) continue;

          try {
            const scriptResponse = await fetch(scriptUrl, {
              method: "GET",
              redirect: "follow",
              headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/javascript,text/javascript,*/*"
              }
            });

            const scriptText = await scriptResponse.text();
            const candidates = extractCandidateStrings(scriptText);

            chunkResults.push({
              url: scriptUrl,
              status: scriptResponse.status,
              length: scriptText.length,
              candidates
            });
          } catch (error) {
            chunkResults.push({
              url: scriptUrl,
              error: error instanceof Error ? error.message : "script fetch failed"
            });
          }
        }

        return corsResponse(
          JSON.stringify(
            {
              ok: upstream.ok,
              status: upstream.status,
              url: targetUrl.toString(),
              bodyLength: body.length,
              scriptCount: scriptSrcs.length,
              scriptSrcs,
              chunkResults
            },
            null,
            2
          ),
          200,
          "application/json; charset=utf-8"
        );
      }

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

function isAllowedPath(pathname) {
  return pathname.startsWith("/view/") || pathname.startsWith("/_next/static/");
}

function extractScriptSrcs(html) {
  const result = [];
  const pattern = /<script[^>]+src=["']([^"']+)["']/g;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    result.push(match[1]);
  }

  return result;
}

function extractDeepHits(text, needles) {
  const hits = [];

  for (const needle of needles) {
    let index = 0;
    let count = 0;

    while (count < 12) {
      const found = text.indexOf(needle, index);
      if (found < 0) break;

      hits.push({
        needle,
        index: found,
        preview: text.slice(Math.max(0, found - 900), Math.min(text.length, found + 1400))
      });

      index = found + needle.length;
      count += 1;
    }
  }

  return hits;
}

function extractCandidateStrings(text) {
  const candidates = new Set();
  const stringPattern = /["'`]([^"'`]{3,500})["'`]/g;
  let match;

  while ((match = stringPattern.exec(text)) !== null) {
    const value = match[1];

    if (isCandidate(value)) {
      candidates.add(value);
    }
  }

  return Array.from(candidates).slice(0, 300);
}

function isCandidate(value) {
  const lower = value.toLowerCase();

  return (
    lower.includes("api") ||
    lower.includes("character") ||
    lower.includes("chara") ||
    lower.includes("sheet") ||
    lower.includes("view") ||
    lower.includes("firebase") ||
    lower.includes("firestore") ||
    lower.includes("graphql") ||
    lower.includes("axios") ||
    lower.includes("fetch") ||
    lower.includes("memo") ||
    lower.includes("items") ||
    lower.includes("weapons") ||
    lower.includes("occupation") ||
    lower.includes("profession") ||
    lower.includes("age") ||
    lower.includes("gender") ||
    lower.includes("profile") ||
    lower.includes("https://") ||
    lower.includes("/api/")
  );
}

function extractNextDataRaw(html) {
  const pattern = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/;
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