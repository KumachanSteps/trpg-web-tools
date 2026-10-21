"""Product detail parsers.

Two public sources are considered:
1. The HTML product page: standard <meta property="og:*">, <link rel=canonical>,
   <html lang> and JSON-LD. These are web standards, not BOOTH-specific guesses.
   BOOTH-specific blocks (description, variants, likes) are read only through
   verified selectors.
2. A candidate public JSON view of the item (`/ja/items/<id>.json`). Whether it
   exists, and its key names, are UNVERIFIED until the Phase 0 probe records
   them; the parser reads every key defensively and reports which were present.

Anything not found stays None. og:description is a SEO snippet, so it is kept
as a labeled fallback and never as the main description.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

from .. import selectors as sel
from ..rules import classify_edition_kind
from .common import item_id_from_url, parse_price_jpy, soup, text_of


@dataclass
class VariantRecord:
    label: str
    external_variant_id: str | None = None
    price_jpy: int | None = None
    availability: str = "UNKNOWN"
    delivery_type: str | None = None
    edition_kind: str = "UNKNOWN"
    evidence: str | None = None


@dataclass
class DetailRecord:
    booth_item_id: int
    title: str | None = None
    title_source: str | None = None
    shop_name: str | None = None
    shop_url: str | None = None
    category_name: str | None = None
    category_path: str | None = None
    description_text: str | None = None
    description_source: str | None = None
    seo_description: str | None = None
    language: str | None = None
    like_count: int | None = None
    like_count_source: str = "UNAVAILABLE"
    listing_status: str = "UNKNOWN"
    tags: list[str] = field(default_factory=list)
    variants: list[VariantRecord] = field(default_factory=list)
    image_alts: list[str] = field(default_factory=list)
    present_keys: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def _meta(doc, prop: str) -> str | None:
    el = doc.find("meta", attrs={"property": prop}) or doc.find("meta", attrs={"name": prop})
    v = el.get("content") if el else None
    return v.strip() if v and v.strip() else None


def parse_detail_html(html: str, booth_item_id: int, url: str, selectors: dict | None = None) -> DetailRecord:
    selectors = selectors if selectors is not None else sel.load()
    doc = soup(html)
    rec = DetailRecord(booth_item_id)

    canonical = doc.find("link", rel="canonical")
    if canonical and canonical.get("href"):
        cid = item_id_from_url(canonical["href"], url)
        if cid is not None and cid != booth_item_id:
            rec.notes.append(f"canonical points to a different item ({cid}); page may be a redirect.")
    if doc.html and doc.html.get("lang"):
        rec.language = doc.html["lang"]

    if og_title := _meta(doc, "og:title"):
        rec.title, rec.title_source = og_title, "og:title"
    rec.seo_description = _meta(doc, "og:description") or _meta(doc, "description")

    for script in doc.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except json.JSONDecodeError:
            continue
        for obj in data if isinstance(data, list) else [data]:
            if isinstance(obj, dict) and obj.get("@type") == "Product":
                rec.present_keys.append("jsonld:Product")
                if obj.get("name") and rec.title_source != "jsonld":
                    rec.title, rec.title_source = obj["name"], "jsonld"
                offers = obj.get("offers")
                if isinstance(offers, dict):
                    offers = [offers]
                for off in offers or []:
                    if isinstance(off, dict) and off.get("priceCurrency") in (None, "JPY") and off.get("price") is not None:
                        try:
                            price = int(float(off["price"]))
                        except (TypeError, ValueError):
                            price = None
                        label = off.get("name") or off.get("sku") or "(offer)"
                        rec.variants.append(VariantRecord(label=label, external_variant_id=off.get("sku"), price_jpy=price, edition_kind=classify_edition_kind(label), evidence="jsonld:offers"))

    main = doc
    if main_css := sel.css(selectors, "detail.main"):
        main = doc.select_one(main_css) or doc
    else:
        rec.notes.append("detail.main selector unverified: recommendation blocks are not excluded, so BOOTH-specific fields are not read from HTML.")

    if main is not doc:
        rec.image_alts = [img.get("alt").strip() for img in main.find_all("img") if img.get("alt") and img.get("alt").strip()]
        if (d := sel.css(selectors, "detail.description")) and (de := main.select_one(d)):
            rec.description_text, rec.description_source = text_of(de), "DOM:detail.description"
        if (lk := sel.css(selectors, "detail.like")) and (le := main.select_one(lk)):
            digits = re.sub(r"\D", "", text_of(le))
            if digits:
                rec.like_count, rec.like_count_source = int(digits), "PRODUCT_PAGE"
        if v := sel.css(selectors, "detail.variant"):
            for ve in main.select(v):
                label = text_of(ve).split("\n")[0]
                rec.variants.append(VariantRecord(label=label, price_jpy=parse_price_jpy(text_of(ve)), edition_kind=classify_edition_kind(label), evidence="DOM:detail.variant"))
    return rec


_AVAILABILITY = {"on_sale": "AVAILABLE", "soldout": "SOLD_OUT", "sold_out": "SOLD_OUT", "out_of_stock": "SOLD_OUT"}
_DELIVERY = {"digital": "DIGITAL", "direct": "PHYSICAL", "physical": "PHYSICAL", "warehouse": "PHYSICAL"}


def parse_item_json(text: str, booth_item_id: int) -> DetailRecord:
    """Parse the candidate item JSON view. Raises ValueError if not JSON."""
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("item JSON is not an object")
    rec = DetailRecord(booth_item_id)
    rec.present_keys = sorted(data.keys())
    if data.get("id") is not None and int(data["id"]) != booth_item_id:
        raise ValueError(f"item JSON id {data['id']} != requested {booth_item_id}")

    if data.get("name"):
        rec.title, rec.title_source = data["name"], "item_json:name"
    if isinstance(data.get("description"), str):
        rec.description_text, rec.description_source = data["description"], "item_json:description"
    shop = data.get("shop") or {}
    if isinstance(shop, dict):
        rec.shop_name, rec.shop_url = shop.get("name"), shop.get("url")
    cat = data.get("category") or {}
    if isinstance(cat, dict) and cat.get("name"):
        rec.category_name = cat["name"]
        parent = (cat.get("parent") or {}).get("name") if isinstance(cat.get("parent"), dict) else None
        rec.category_path = f"{parent}/{cat['name']}" if parent else cat["name"]
    wl = data.get("wish_lists_count")
    if isinstance(wl, int) and wl >= 0:
        rec.like_count, rec.like_count_source = wl, "PUBLIC_STRUCTURED_DATA"
    rec.tags = [t["name"] for t in data.get("tags") or [] if isinstance(t, dict) and t.get("name")]
    if data.get("is_end_of_sale") is True:
        rec.listing_status = "UNLISTED"
    elif data.get("is_sold_out") is True:
        rec.listing_status = "SOLD_OUT"
    elif data.get("is_sold_out") is False:
        rec.listing_status = "AVAILABLE"
    for v in data.get("variations") or []:
        if not isinstance(v, dict):
            continue
        label = v.get("name") or rec.title or "(unnamed variant)"
        price = v.get("price")
        rec.variants.append(
            VariantRecord(
                label=label,
                external_variant_id=str(v["id"]) if v.get("id") is not None else None,
                price_jpy=price if isinstance(price, int) and price >= 0 else None,
                availability=_AVAILABILITY.get(str(v.get("status")), "UNKNOWN"),
                delivery_type=_DELIVERY.get(str(v.get("type")), "UNKNOWN") if v.get("type") else None,
                edition_kind=classify_edition_kind(label),
                evidence="item_json:variations",
            )
        )
    return rec
