"""Helps find real CSS selectors in a saved snapshot: give it text you know is
on the page (e.g. the title from the item JSON) and it prints where it occurs."""
from __future__ import annotations

from bs4 import Tag

from .parsers.common import soup


def css_path(el: Tag) -> str:
    parts = []
    while isinstance(el, Tag) and el.name not in ("html", "[document]"):
        cls = ".".join(el.get("class") or [])
        ident = f"#{el['id']}" if el.get("id") else ""
        parts.append(f"{el.name}{ident}{'.' + cls if cls else ''}")
        el = el.parent
    return " > ".join(reversed(parts))


def find_text(html: str, needle: str, limit: int = 20) -> list[dict]:
    doc = soup(html)
    out = []
    for s in doc.find_all(string=lambda t: t and needle in t):
        parent = s.parent
        if parent.name in ("script", "style", "title"):
            continue
        out.append({"path": css_path(parent), "snippet": s.strip()[:120]})
        if len(out) >= limit:
            break
    return out


def summarize_classes(html: str, top: int = 40) -> list[tuple[str, int]]:
    from collections import Counter

    c = Counter()
    for el in soup(html).find_all(True):
        for cls in el.get("class") or []:
            c[cls] += 1
    return c.most_common(top)
