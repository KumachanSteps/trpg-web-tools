"""Parser tests on SYNTHETIC html/json written for this test file. They check
parser logic only and say nothing about BOOTH's real markup."""
import json

from booth_scenario.parsers.detail import parse_detail_html, parse_item_json
from booth_scenario.parsers.listing import parse_listing

LISTING = """<html><body>
<a href="https://shop-a.booth.pm/items/111">A</a><a href="https://booth.pm/ja/items/222">B</a>
<a href="/en/items/111">A again</a><a href="https://booth.pm/ja/items/abc">bad</a>
<a href="/en/browse/Tabletop%20RPG?page=2">2</a><a href="/en/browse/Tabletop%20RPG?page=3">3</a>
<a href="/en/other?page=9">elsewhere</a>
</body></html>"""
URL = "https://booth.pm/en/browse/Tabletop%20RPG?in_stock=true"


def test_listing_without_verified_selectors_reports_links_only():
    p = parse_listing(LISTING, URL, selectors={})
    assert p.item_ids_from_links == [111, 222]
    assert p.card_count is None and p.method == "LINKS_ONLY"
    assert p.page_numbers == [2, 3]
    assert p.next_page_url.endswith("page=2")
    assert all(c.price_jpy is None and c.like_count is None for c in p.cards)


def test_listing_with_verified_selector():
    html = '<div class="c"><a href="/ja/items/5">x</a><span class="p">¥ 1,200</span></div><aside><a href="/ja/items/9">rec</a></aside>'
    s = {"listing.card": {"css": "div.c", "verified": True}, "listing.card_price": {"css": ".p", "verified": True}}
    p = parse_listing(html, URL, selectors=s)
    assert [c.booth_item_id for c in p.cards] == [5] and p.cards[0].price_jpy == 1200 and p.card_count == 1


def test_unverified_selector_is_ignored():
    s = {"listing.card": {"css": "div.c", "verified": False}}
    assert parse_listing('<div class="c"><a href="/ja/items/5">x</a></div>', URL, selectors=s).card_count is None


DETAIL = """<html lang="ja"><head>
<meta property="og:title" content="テストシナリオ - BOOTH">
<meta property="og:description" content="SEO snippet">
<link rel="canonical" href="https://booth.pm/ja/items/42">
</head><body><main><h1>テストシナリオ</h1></main>
<section><a href="/ja/items/77">おすすめ商品</a><span>¥ 9,999</span></section></body></html>"""


def test_related_products_do_not_leak_into_detail():
    r = parse_detail_html(DETAIL, 42, "https://booth.pm/ja/items/42", selectors={})
    assert r.title == "テストシナリオ - BOOTH" and r.title_source == "og:title"
    assert r.variants == [] and r.description_text is None and r.like_count is None
    assert r.seo_description == "SEO snippet" and r.language == "ja"


def test_detail_main_selector_scopes_reads():
    s = {"detail.main": {"css": "main", "verified": True}, "detail.variant": {"css": "h1", "verified": True}}
    r = parse_detail_html(DETAIL, 42, "https://booth.pm/ja/items/42", selectors=s)
    assert [v.label for v in r.variants] == ["テストシナリオ"]


def test_item_json_defensive():
    data = {"id": 42, "name": "N", "description": "推奨人数：1PL", "wish_lists_count": 12,
            "shop": {"name": "S", "url": "https://s.booth.pm/"},
            "category": {"name": "TRPG", "parent": {"name": "ゲーム"}},
            "is_sold_out": False,
            "variations": [{"id": 1, "name": "本編PDF", "price": 1000, "status": "on_sale", "type": "digital"},
                           {"id": 2, "name": "お試し版", "price": 0, "status": "weird"}]}
    r = parse_item_json(json.dumps(data), 42)
    assert r.like_count == 12 and r.like_count_source == "PUBLIC_STRUCTURED_DATA"
    assert r.category_path == "ゲーム/TRPG" and r.listing_status == "AVAILABLE"
    assert [(v.edition_kind, v.availability) for v in r.variants] == [("FULL", "AVAILABLE"), ("SAMPLE", "UNKNOWN")]


def test_item_json_missing_keys_are_unknown():
    r = parse_item_json('{"id": 1}', 1)
    assert r.like_count is None and r.like_count_source == "UNAVAILABLE" and r.listing_status == "UNKNOWN"
