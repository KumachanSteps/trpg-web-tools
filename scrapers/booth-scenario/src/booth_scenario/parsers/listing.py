"""Category/search listing page parser.

Without a verified `listing.card` selector the only facts taken from the page
are item IDs (from item links, in document order) and `page=` pagination links.
Card count, price, shop and likes stay None until a selector is verified.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit

from .. import selectors as sel
from .common import item_id_from_url, page_param, parse_price_jpy, soup, text_of


@dataclass
class Card:
    booth_item_id: int
    position: int
    price_jpy: int | None = None
    shop_name: str | None = None
    like_count: int | None = None


@dataclass
class ListingPage:
    url: str
    cards: list[Card]
    card_count: int | None  # None = card boundary not verified
    item_ids_from_links: list[int]
    page_numbers: list[int]
    next_page_url: str | None
    method: str
    notes: list[str] = field(default_factory=list)


def parse_listing(html: str, url: str, current_page: int = 1, selectors: dict | None = None) -> ListingPage:
    selectors = selectors if selectors is not None else sel.load()
    doc = soup(html)
    notes: list[str] = []

    link_ids: list[int] = []
    for a in doc.find_all("a", href=True):
        iid = item_id_from_url(a["href"], url)
        if iid is not None and iid not in link_ids:
            link_ids.append(iid)

    cards: list[Card] = []
    card_css = sel.css(selectors, "listing.card")
    if card_css:
        method = "DOM:listing.card"
        for el in doc.select(card_css):
            iid = next((item_id_from_url(a["href"], url) for a in el.find_all("a", href=True) if item_id_from_url(a["href"], url)), None)
            if iid is None or any(c.booth_item_id == iid for c in cards):
                continue
            c = Card(iid, len(cards) + 1)
            if (p := sel.css(selectors, "listing.card_price")) and (pe := el.select_one(p)):
                c.price_jpy = parse_price_jpy(text_of(pe))
            if (s := sel.css(selectors, "listing.card_shop")) and (se := el.select_one(s)):
                c.shop_name = text_of(se) or None
            if (lk := sel.css(selectors, "listing.card_like")) and (le := el.select_one(lk)):
                digits = "".join(ch for ch in text_of(le) if ch.isdigit())
                c.like_count = int(digits) if digits else None
            cards.append(c)
        card_count = len(cards)
    else:
        method = "LINKS_ONLY"
        notes.append("listing.card selector unverified: item IDs come from all item links and may include non-result links (ads, recommendations).")
        cards = [Card(iid, i + 1) for i, iid in enumerate(link_ids)]
        card_count = None

    base_path = urlsplit(url).path
    pages: dict[int, str] = {}
    for a in doc.find_all("a", href=True):
        full = urljoin(url, a["href"])
        n = page_param(full)
        if n is not None and urlsplit(full).path == base_path:
            pages.setdefault(n, full)
    next_url = pages.get(current_page + 1)
    if (pg := sel.css(selectors, "listing.pagination")) and (ne := doc.select_one(pg)) and ne.get("href"):
        next_url = urljoin(url, ne["href"])
    elif pages:
        notes.append("pagination taken from same-path links with a page= parameter (heuristic).")
    return ListingPage(
        url=url,
        cards=cards,
        card_count=card_count,
        item_ids_from_links=link_ids,
        page_numbers=sorted(pages),
        next_page_url=next_url,
        method=method,
        notes=notes,
    )
