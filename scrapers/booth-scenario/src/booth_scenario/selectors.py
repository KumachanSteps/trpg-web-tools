"""Loads selectors.json. A selector is only used once a human/probe verified it."""
from __future__ import annotations

import json
from importlib import resources
from pathlib import Path


def load(path: str | Path | None = None) -> dict[str, dict]:
    if path is None:
        text = (resources.files("booth_scenario") / "selectors.json").read_text(encoding="utf-8")
    else:
        text = Path(path).read_text(encoding="utf-8")
    return {k: v for k, v in json.loads(text).items() if not k.startswith("_")}


def css(selectors: dict[str, dict], key: str) -> str | None:
    entry = selectors.get(key) or {}
    return entry.get("css") if entry.get("verified") else None
