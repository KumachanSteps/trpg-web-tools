import pytest

from booth_scenario.fetcher import PoliteFetcher, Refused, StopCrawl

ROBOTS = b"User-agent: *\nDisallow: /ja/items/666\n"


class FakeNet:
    def __init__(self, responses):
        self.responses = responses  # url -> list of (status, body)
        self.calls = []

    def __call__(self, url, timeout):
        self.calls.append(url)
        if url.endswith("/robots.txt"):
            return 200, "text/plain", ROBOTS
        seq = self.responses[url]
        status, body = seq.pop(0) if len(seq) > 1 else seq[0]
        return status, "text/html", body


def make(tmp_path, net, **kw):
    sleeps = []
    t = [0.0]
    f = PoliteFetcher(tmp_path, delay=8, opener=net, sleep=lambda s: (sleeps.append(s), t.__setitem__(0, t[0] + s)), clock=lambda: t[0], **kw)
    return f, sleeps


U = "https://booth.pm/ja/items/1"


def test_cache_prevents_second_request(tmp_path):
    net = FakeNet({U: [(200, b"<html>ok</html>")]})
    f, _ = make(tmp_path, net)
    assert not f.fetch(U).from_cache
    assert f.fetch(U).from_cache
    assert net.calls.count(U) == 1


def test_delay_between_requests(tmp_path):
    net = FakeNet({U: [(200, b"a")], U + "2": [(200, b"b")]})
    f, sleeps = make(tmp_path, net)
    f.fetch(U)
    f.fetch(U + "2")
    assert sleeps and all(s == pytest.approx(8) for s in sleeps)


def test_403_stops(tmp_path):
    f, _ = make(tmp_path, FakeNet({U: [(403, b"no")]}))
    with pytest.raises(StopCrawl):
        f.fetch(U)


def test_repeated_429_stops_with_backoff(tmp_path):
    f, sleeps = make(tmp_path, FakeNet({U: [(429, b"slow")]}), max_429=3)
    with pytest.raises(StopCrawl):
        f.fetch(U)
    assert 16 in sleeps and 32 in sleeps


def test_429_then_ok(tmp_path):
    f, _ = make(tmp_path, FakeNet({U: [(429, b""), (200, b"ok")]}))
    assert f.fetch(U).body == "ok"


def test_captcha_stops(tmp_path):
    f, _ = make(tmp_path, FakeNet({U: [(200, b"<html>Please solve the CAPTCHA</html>")]}))
    with pytest.raises(StopCrawl):
        f.fetch(U)


def test_captcha_stop_keeps_page_but_not_cache(tmp_path):
    f, _ = make(tmp_path, FakeNet({U: [(503, b"<html><title>Just a moment...</title></html>")]}))
    with pytest.raises(StopCrawl):
        f.fetch(U)
    assert len(list(tmp_path.glob("*.stopped.html"))) == 1
    assert not list(tmp_path.glob("*.body"))


def test_passive_cloudflare_beacon_is_not_a_challenge(tmp_path):
    # Normal booth.pm pages load this script; it must not stop the crawl.
    beacon = b"<html><body>item</body><script>a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';</script></html>"
    f, _ = make(tmp_path, FakeNet({U: [(200, beacon)]}))
    assert f.fetch(U).status == 200


def test_scope_refusals(tmp_path):
    f, _ = make(tmp_path, FakeNet({}))
    for bad in ["https://example.com/x", "http://booth.pm/ja/items/1", "https://booth.pm/downloadables/123", "https://shop.booth.pm/items/1"]:
        with pytest.raises(Refused):
            f.fetch(bad)


def test_robots_disallow(tmp_path):
    f, _ = make(tmp_path, FakeNet({}))
    with pytest.raises(Refused):
        f.fetch("https://booth.pm/ja/items/666")
