"""Phase 0 probe targets from CODEX_PHASE0_HANDOFF.md."""

COC_TAG = "クトゥルフ神話TRPG"

CATEGORY_URLS = {
    "Tabletop RPG": "https://booth.pm/en/browse/Tabletop%20RPG?in_stock=true&tags%5B%5D=%E3%82%AF%E3%83%88%E3%82%A5%E3%83%AB%E3%83%95%E7%A5%9E%E8%A9%B1TRPG",
    "Tabletop Games": "https://booth.pm/en/browse/Tabletop%20Games?in_stock=true&tags%5B%5D=%E3%82%AF%E3%83%88%E3%82%A5%E3%83%AB%E3%83%95%E7%A5%9E%E8%A9%B1TRPG",
}

SAMPLE_IDS = {
    "coc": [3403696, 1712065, 3408537, 3790708, 1710879, 2907962, 3083345, 3827548, 647539, 3251000, 2625282, 3954297],
    "emoklore": [3846658, 5426186, 3645142, 3214445, 4675060, 6860713, 3790300, 5989929, 3557484],
    "collections": [4604659, 590976, 958529, 6407066, 8493819, 4946326],
}

# Default 10-item detail probe: spread across the three groups. Which of these
# are variants/bundles/samples is not known yet; the probe report records it.
DEFAULT_DETAIL_PROBE = SAMPLE_IDS["coc"][:4] + SAMPLE_IDS["emoklore"][:3] + SAMPLE_IDS["collections"][:3]


def item_page_url(item_id: int) -> str:
    return f"https://booth.pm/ja/items/{item_id}"


def item_json_url(item_id: int) -> str:
    return f"https://booth.pm/ja/items/{item_id}.json"
