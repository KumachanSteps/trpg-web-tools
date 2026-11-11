const DEFAULT_ALLOWED_ORIGINS = new Set([
  "https://kumachansteps.github.io"
]);

const MAX_REQUEST_BYTES = 4096;
const MAX_ICAL_BYTES = 8 * 1024 * 1024;

export default {
  async fetch(request, env = {}) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = getAllowedOrigins(env);
    const allowedOrigin = resolveAllowedOrigin(origin, allowedOrigins);

    if (request.method === "OPTIONS") {
      if (!allowedOrigin) return jsonResponse({ ok: false, error: "Origin not allowed" }, 403, "");
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin, "text/plain; charset=utf-8") });
    }

    if (request.method === "GET") {
      return jsonResponse({ ok: true, service: "trpg-calendar-ical-proxy", version: "1.0.0" }, 200, allowedOrigin);
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, allowedOrigin);
    }

    if (!allowedOrigin) return jsonResponse({ ok: false, error: "Origin not allowed" }, 403, "");

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ ok: false, error: "Request too large" }, 413, allowedOrigin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON" }, 400, allowedOrigin);
    }

    const target = validateCalendarUrl(payload?.url);
    if (!target.ok) return jsonResponse({ ok: false, error: target.error }, 400, allowedOrigin);

    try {
      const upstream = await fetch(target.url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "Accept": "text/calendar",
          "User-Agent": "TRPG-Session-Calendar/1.0"
        }
      });

      if (!upstream.ok) {
        return jsonResponse({ ok: false, error: `Google Calendar returned HTTP ${upstream.status}` }, 502, allowedOrigin);
      }

      const upstreamType = upstream.headers.get("Content-Type") || "";
      const body = await upstream.text();
      if (new TextEncoder().encode(body).byteLength > MAX_ICAL_BYTES) {
        return jsonResponse({ ok: false, error: "Calendar feed is too large" }, 413, allowedOrigin);
      }
      if (!body.includes("BEGIN:VCALENDAR") || (!upstreamType.includes("text/calendar") && !body.includes("BEGIN:VEVENT"))) {
        return jsonResponse({ ok: false, error: "Google did not return an iCalendar feed" }, 502, allowedOrigin);
      }

      return new Response(body, {
        status: 200,
        headers: corsHeaders(allowedOrigin, "text/calendar; charset=utf-8")
      });
    } catch {
      return jsonResponse({ ok: false, error: "Unable to fetch Google Calendar" }, 502, allowedOrigin);
    }
  }
};

function getAllowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

function resolveAllowedOrigin(origin, allowedOrigins) {
  if (allowedOrigins.has(origin)) return origin;
  try {
    const url = new URL(origin);
    if (url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost")) return origin;
  } catch {}
  return "";
}

function validateCalendarUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    return { ok: false, error: "Invalid calendar URL" };
  }
  if (url.protocol !== "https:" || url.hostname !== "calendar.google.com") {
    return { ok: false, error: "Only HTTPS Google Calendar URLs are allowed" };
  }
  if (!url.pathname.startsWith("/calendar/ical/") || !url.pathname.endsWith("/basic.ics")) {
    return { ok: false, error: "Only Google Calendar iCal basic.ics feeds are allowed" };
  }
  if (url.username || url.password || url.search || url.hash) {
    return { ok: false, error: "Calendar URL must not contain credentials, query, or fragment" };
  }
  return { ok: true, url: url.toString() };
}

function jsonResponse(payload, status, allowedOrigin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(allowedOrigin, "application/json; charset=utf-8")
  });
}

function corsHeaders(allowedOrigin, contentType) {
  const headers = {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin"
  };
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Accept";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}
