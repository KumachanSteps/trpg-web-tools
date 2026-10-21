from __future__ import annotations

import re
from urllib.parse import parse_qs, urljoin, urlsplit

from bs4 import BeautifulSoup

# booth.pm/ja/items/123, booth.pm/items/123, shopname.booth.pm/items/123
ITEM_URL_RE = re.compile(r"^https?://(?:[a-z0-9-]+\.)?booth\.pm/(?:[a-z]{2}(?:-[a-z]+)?/)?items/(\d+)(?:[/?#]|$)", re.I)


def soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "html.parser")


def item_id_from_url(href: str, base: str = "https://booth.pm/") -> int | None:
    m = ITEM_URL_RE.match(urljoin(base, href))
    return int(m.group(1)) if m else None


def page_param(href: str) -> int | None:
    vals = parse_qs(urlsplit(href).query).get("page")
    if vals and vals[0].isdigit():
        return int(vals[0])
    return None


def parse_price_jpy(text: str | None) -> int | None:
    """'¥ 1,000' / '1000 JPY' / '無料' -> int. Anything unclear -> None (not 0)."""
    if text is None:
        return None
    t = text.strip()
    if re.fullmatch(r"(無料|free|Free|FREE)", t):
        return 0
    m = re.search(r"(?:¥|￥|JPY)\s*([\d,]+)|([\d,]+)\s*(?:円|JPY)", t)
    if not m:
        return None
    return int((m.group(1) or m.group(2)).replace(",", ""))


def text_of(el) -> str:
    return re.sub(r"[ \t　]+", " ", el.get_text("\n", strip=True)) if el is not None else ""
