"""Export the public catalog (catalog/v1) that the web tools read from GitHub Pages.

Output: <out_dir>/manifest.json and scenarios-NNN.json shards. Only public listing
facts are exported; descriptions, evidence text and user acquisition data never are.
Unknown stays null (e.g. secret_ho is true only with an HO condition on record).
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path

from .db import utcnow

SCHEMA = "catalog/v1"
LICENSE = "CC BY 4.0"
ATTRIBUTION = "シナリオカタログ © KumachanSteps / TRPG WEBツール観測所（CC BY 4.0）"
SYSTEMS = {"COC6", "COC7", "EMOKLORE", "OTHER", "UNKNOWN"}


def _rows(conn, sql, args=()):
    return [dict(r) for r in conn.execute(sql, args).fetchall()]


def _players(modes: list[dict]) -> dict:
    mins = [m["player_min"] for m in modes if m["player_min"] is not None]
    maxs = [m["player_max"] for m in modes if m["player_max"] is not None]
    out: dict = {"min": min(mins) if mins else None, "max": max(maxs) if maxs else (max(mins) if mins else None)}
    kinds = {m["mode"] for m in modes}
    if out["min"] is None and kinds & {"ONE_ON_ONE", "SOLO", "GMLESS_SOLO", "ONE_PLAYER_UNSPECIFIED"}:
        out["min"] = out["max"] = 1
    if "SOLO" in kinds or "GMLESS_SOLO" in kinds:
        out["label"] = "ソロ"
    return out


def _secret_ho(modes: list[dict], has_ho_condition: bool) -> bool | None:
    """True if any way to play has secret handouts; False only when every mode says none."""
    flags = [m.get("secret_handouts") for m in modes]
    if has_ho_condition or 1 in flags:
        return True
    if flags and all(f == 0 for f in flags):
        return False
    return None


def _duration(rows: list[dict]) -> dict:
    main = [d for d in rows if d["scope"] in ("MAIN", "UNSPECIFIED", "ALL_EPISODES")] or rows
    mins = [d["min_minutes"] for d in main if d["min_minutes"] is not None]
    maxs = [d["max_minutes"] for d in main if d["max_minutes"] is not None]
    return {
        "min": min(mins) if mins else None,
        "max": max(maxs) if maxs else (max(mins) if mins else None),
        "approximate": any(d["approximate"] for d in main),
    }


def _price(variants: list[dict]) -> dict:
    full = [v for v in variants if v["coverage"] == "COMPLETE" and v["edition_kind"] in ("FULL", "FREE_PLAYABLE_EDITION", "UNKNOWN")]
    prices = [v["price_jpy"] for v in full if v["price_jpy"] is not None and v["availability"] != "UNAVAILABLE"]
    return {"min": min(prices), "max": max(prices)} if prices else {"min": None, "max": None}


def _json_list(text: str | None) -> list:
    if not text:
        return []
    try:
        v = json.loads(text)
    except json.JSONDecodeError:
        return []
    return [str(x) for x in v] if isinstance(v, list) else []


def scenario_record(conn: sqlite3.Connection, sc: dict) -> dict:
    sid = sc["scenario_id"]
    products = _rows(conn, """
        SELECT p.booth_item_id, p.product_url, p.title, p.cover_image_url, p.first_seen_at, ps.relation_type,
               pub.shop_name, pub.shop_url
        FROM product_scenarios ps JOIN products p USING(booth_item_id)
        LEFT JOIN publishers pub ON pub.publisher_id = p.publisher_id
        WHERE ps.scenario_id = ? AND ps.relation_type != 'RELATED'
        ORDER BY ps.relation_type = 'STANDALONE' DESC, p.booth_item_id""", (sid,))
    main = products[0] if products else {}
    variants = _rows(conn, """
        SELECT pv.price_jpy, pv.availability, pv.edition_kind, vs.coverage
        FROM variant_scenarios vs JOIN product_variants pv USING(variant_id) WHERE vs.scenario_id = ?""", (sid,))
    modes = _rows(conn, "SELECT * FROM scenario_session_modes WHERE scenario_id = ?", (sid,))
    durations = _rows(conn, "SELECT * FROM scenario_durations WHERE scenario_id = ?", (sid,))
    has_ho_condition = conn.execute("SELECT 1 FROM scenario_conditions WHERE scenario_id = ? AND category = 'HO'", (sid,)).fetchone()
    titles = []
    for p in products:
        t = (p["title"] or "").strip()
        if t and t != sc["canonical_title"] and t not in titles:
            titles.append(t)
    first_seen = min((p["first_seen_at"] for p in products if p["first_seen_at"]), default=None)
    system = sc["system_primary"] if sc["system_primary"] in SYSTEMS else "UNKNOWN"
    return {
        "id": sid,
        "title": sc["canonical_title"],
        "aliases": titles,
        "system": system,
        "players": _players(modes),
        "duration": _duration(durations),
        "secret_ho": _secret_ho(modes, bool(has_ho_condition)),
        "price": _price(variants),
        "writers": [],
        "circle": {"name": main.get("shop_name"), "url": main.get("shop_url")},
        "source": {"site": "BOOTH", "url": main.get("product_url"), "item_id": main.get("booth_item_id")},
        "cover_url": main.get("cover_image_url"),
        "published_at": None,
        "first_seen_at": first_seen[:10] if first_seen else None,
        "tags": _json_list(sc["genre_json"]),
    }


def export_catalog(conn: sqlite3.Connection, out_dir: Path, shard_size: int = 2000, generated_at: str | None = None) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    scenarios = _rows(conn, "SELECT * FROM scenarios ORDER BY scenario_id")
    records = [scenario_record(conn, sc) for sc in scenarios]
    shards = []
    for n, start in enumerate(range(0, max(len(records), 1), shard_size)):
        part = records[start:start + shard_size]
        text = json.dumps({"schema": SCHEMA, "scenarios": part}, ensure_ascii=False, separators=(",", ":")) + "\n"
        name = f"scenarios-{n:03d}.json"
        (out_dir / name).write_text(text, encoding="utf-8")
        shards.append({"path": name, "count": len(part), "sha256": hashlib.sha256(text.encode()).hexdigest()})
    keep = {s["path"] for s in shards}
    for old in out_dir.glob("scenarios-*.json"):
        if old.name not in keep:
            old.unlink()
    generated_at = generated_at or utcnow()
    version = hashlib.sha256("".join(s["sha256"] for s in shards).encode()).hexdigest()[:16]
    manifest = {
        "schema": SCHEMA,
        "version": version,
        "generated_at": generated_at,
        "sample": False,
        "license": LICENSE,
        "attribution": ATTRIBUTION,
        "counts": {"scenarios": len(records)},
        "shards": shards,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return manifest
