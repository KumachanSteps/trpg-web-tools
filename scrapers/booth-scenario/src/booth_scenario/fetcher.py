"""Polite, sequential HTTP fetcher for public BOOTH pages.

Safety rules (from the Phase 0 handoff):
- one request at a time, fixed delay between network requests (default 8 s)
- on-disk cache so repeated probes do not re-hit the site
- robots.txt honored; no authentication, no cookies, no evasion
- stop immediately on 403 or a CAPTCHA page; stop after repeated 429
- only public product metadata pages; downloadable assets are refused
"""
from __future__ import annotations

import hashlib
import json
import time
import urllib.error
import urllib.request
import urllib.robotparser
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from urllib.parse import urlsplit

from . import __version__
from .db import utcnow

USER_AGENT = (
    f"booth-scenario-probe/{__version__} "
    "(personal TRPG scenario catalog research; low-rate, sequential)"
)
ALLOWED_HOSTS = {"booth.pm"}
# Paths that lead to purchased/downloadable content or account pages.
FORBIDDEN_PATH_PARTS = ("/downloadables/", "/orders", "/purchases", "/users/sign_in", "/settings", "/library")


class StopCrawl(RuntimeError):
    """The site asked us to stop (403, CAPTCHA, repeated 429). Do not retry."""


class Refused(ValueError):
    """The URL is outside the allowed scope; nothing was requested."""


@dataclass
class FetchResult:
    url: str
    status: int
    body: str
    fetched_at: str
    from_cache: bool
    content_type: str = ""


def _default_opener(url: str, timeout: float) -> tuple[int, str, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "ja,en;q=0.5"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.headers.get("Content-Type", ""), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", "") if e.headers else "", e.read() or b""


# Markers that only appear on a Cloudflare challenge interstitial. Do not add
# "challenge-platform": every normal booth.pm page loads the passive
# /cdn-cgi/challenge-platform/scripts/jsd/main.js beacon (seen in all listing
# snapshots, 2026-10-21), which made the first detail probe stop on a normal page.
CHALLENGE_MARKERS = ("cf-challenge", "_cf_chl_opt", "cf-chl-", "<title>just a moment")


def looks_like_captcha(body: str) -> bool:
    """A challenge interstitial, not a normal page that merely loads a captcha script."""
    low = body.lower()
    if any(m in low for m in CHALLENGE_MARKERS):
        return True
    return "captcha" in low and len(body) < 30_000


class PoliteFetcher:
    def __init__(
        self,
        cache_dir: str | Path,
        delay: float = 8.0,
        max_429: int = 3,
        timeout: float = 30.0,
        opener: Callable[[str, float], tuple[int, str, bytes]] = _default_opener,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
        respect_robots: bool = True,
    ):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.delay = delay
        self.max_429 = max_429
        self.timeout = timeout
        self._open = opener
        self._sleep = sleep
        self._clock = clock
        self._last_request: float | None = None
        self.respect_robots = respect_robots
        self._robots: urllib.robotparser.RobotFileParser | None = None
        self.network_requests = 0

    # -- scope ---------------------------------------------------------------
    @staticmethod
    def check_scope(url: str) -> None:
        parts = urlsplit(url)
        if parts.scheme != "https" or parts.hostname not in ALLOWED_HOSTS:
            raise Refused(f"host not allowed: {url}")
        if any(p in parts.path for p in FORBIDDEN_PATH_PARTS):
            raise Refused(f"path not allowed (downloads/account): {url}")

    # -- cache ---------------------------------------------------------------
    def _cache_paths(self, url: str) -> tuple[Path, Path]:
        key = hashlib.sha256(url.encode()).hexdigest()[:32]
        return self.cache_dir / f"{key}.body", self.cache_dir / f"{key}.json"

    def _read_cache(self, url: str) -> FetchResult | None:
        body_p, meta_p = self._cache_paths(url)
        if not (body_p.exists() and meta_p.exists()):
            return None
        meta = json.loads(meta_p.read_text(encoding="utf-8"))
        return FetchResult(url, meta["status"], body_p.read_text(encoding="utf-8"), meta["fetched_at"], True, meta.get("content_type", ""))

    def _write_cache(self, r: FetchResult) -> None:
        body_p, meta_p = self._cache_paths(r.url)
        body_p.write_text(r.body, encoding="utf-8")
        meta_p.write_text(json.dumps({"url": r.url, "status": r.status, "fetched_at": r.fetched_at, "content_type": r.content_type}), encoding="utf-8")

    def _save_stopped(self, url: str, status: int, body: str) -> None:
        """Keep the page that stopped the crawl so the stop can be checked offline."""
        body_p, _ = self._cache_paths(url)
        stop_p = body_p.with_suffix(".stopped.html")
        stop_p.write_text(f"<!-- {url} HTTP {status} {utcnow()} -->\n{body}", encoding="utf-8")

    # -- network -------------------------------------------------------------
    def _wait_turn(self) -> None:
        if self._last_request is not None:
            remaining = self.delay - (self._clock() - self._last_request)
            if remaining > 0:
                self._sleep(remaining)

    def _raw(self, url: str) -> tuple[int, str, str]:
        self._wait_turn()
        self._last_request = self._clock()
        self.network_requests += 1
        try:
            status, ctype, data = self._open(url, self.timeout)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            raise StopCrawl(f"network error on {url}: {e}") from e
        return status, ctype, data.decode("utf-8", errors="replace")

    def _robots_allows(self, url: str) -> bool:
        if not self.respect_robots:
            return True
        if self._robots is None:
            rp = urllib.robotparser.RobotFileParser()
            status, _, body = self._raw("https://booth.pm/robots.txt")
            if status == 403:
                raise StopCrawl("robots.txt returned 403")
            if status >= 400:
                rp.parse([])  # robots missing: treat as allow-all, per convention
            else:
                rp.parse(body.splitlines())
            self._robots = rp
        return self._robots.can_fetch(USER_AGENT, url)

    def fetch(self, url: str, use_cache: bool = True) -> FetchResult:
        self.check_scope(url)
        if use_cache and (cached := self._read_cache(url)) is not None:
            return cached
        if not self._robots_allows(url):
            raise Refused(f"disallowed by robots.txt: {url}")
        hits_429 = 0
        while True:
            status, ctype, body = self._raw(url)
            if status == 429:
                hits_429 += 1
                if hits_429 >= self.max_429:
                    raise StopCrawl(f"repeated 429 ({hits_429}x) on {url}")
                self._sleep(self.delay * (2 ** hits_429))
                continue
            if status == 403:
                raise StopCrawl(f"403 Forbidden on {url}")
            if looks_like_captcha(body):
                self._save_stopped(url, status, body)
                raise StopCrawl(f"CAPTCHA/challenge page on {url} (HTTP {status})")
            result = FetchResult(url, status, body, utcnow(), False, ctype)
            if status < 500:
                self._write_cache(result)
            return result
