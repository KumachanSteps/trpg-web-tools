"""Derived views from SCHEMA_SPEC 'Availability vs ownership'. All three-valued:
True / False / None (unknown)."""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field


def _variants_for(conn, scenario_id: str):
    return conn.execute(
        """SELECT pv.*, vs.coverage, vs.verification_status, p.detail_fetched_at
           FROM variant_scenarios vs JOIN product_variants pv USING(variant_id)
           JOIN products p ON p.booth_item_id = pv.booth_item_id
           WHERE vs.scenario_id = ?""",
        (scenario_id,),
    ).fetchall()


def _all_products_fetched(conn, scenario_id: str) -> bool:
    rows = conn.execute(
        """SELECT p.detail_fetched_at FROM product_scenarios ps JOIN products p USING(booth_item_id)
           WHERE ps.scenario_id = ?""",
        (scenario_id,),
    ).fetchall()
    return bool(rows) and all(r[0] for r in rows)


def is_scenario_free(conn: sqlite3.Connection, scenario_id: str) -> bool | None:
    full = [v for v in _variants_for(conn, scenario_id) if v["coverage"] == "COMPLETE" and v["edition_kind"] == "FULL"]
    if any(v["price_jpy"] == 0 and v["availability"] == "AVAILABLE" for v in full):
        return True
    known = full and all(v["price_jpy"] is not None and v["availability"] != "UNKNOWN" for v in full)
    if known and _all_products_fetched(conn, scenario_id):
        return False
    return None


def has_free_sample(conn: sqlite3.Connection, scenario_id: str, include_collection_scope: bool = False) -> bool | None:
    if conn.execute(
        "SELECT 1 FROM sample_offers WHERE scenario_id=? AND price_jpy=0 AND availability='AVAILABLE'", (scenario_id,)
    ).fetchone():
        return True
    if any(v["coverage"] == "SAMPLE" and v["price_jpy"] == 0 and v["availability"] == "AVAILABLE" for v in _variants_for(conn, scenario_id)):
        return True
    if include_collection_scope and conn.execute(
        """SELECT 1 FROM sample_offers so JOIN collection_scenarios cs USING(collection_id)
           WHERE cs.scenario_id=? AND so.scenario_id IS NULL AND so.price_jpy=0 AND so.availability='AVAILABLE'""",
        (scenario_id,),
    ).fetchone():
        return True
    return False if _all_products_fetched(conn, scenario_id) else None


def free_playable_edition_available(conn, scenario_id: str) -> bool | None:
    rows = _variants_for(conn, scenario_id)
    if any(v["edition_kind"] == "FREE_PLAYABLE_EDITION" and v["price_jpy"] == 0 and v["availability"] == "AVAILABLE" for v in rows):
        return True
    if conn.execute("SELECT 1 FROM sample_offers WHERE scenario_id=? AND sample_type='FREE_PLAYABLE_EDITION' AND price_jpy=0 AND availability='AVAILABLE'", (scenario_id,)).fetchone():
        return True
    return None


# -- private (per user) ---------------------------------------------------------
def acquired_offers(conn, user_id: str, scenario_id: str) -> list[dict]:
    """Every acquisition touching the scenario, with the coverage it grants."""
    rows = conn.execute(
        """SELECT ar.acquisition_id, ar.acquisition_type, ar.scope, ar.variant_id,
                  COALESCE(vs.coverage, CASE ar.scope WHEN 'FULL' THEN 'COMPLETE' ELSE ar.scope END) AS coverage,
                  COALESCE(vs.verification_status, 'UNVERIFIED') AS verification_status
           FROM acquisition_records ar
           LEFT JOIN variant_scenarios vs ON vs.variant_id = ar.variant_id AND vs.scenario_id = ?
           WHERE ar.user_id = ? AND (ar.scenario_id = ? OR vs.scenario_id IS NOT NULL)""",
        (scenario_id, user_id, scenario_id),
    ).fetchall()
    return [dict(r) for r in rows]


def purchase_status(conn, user_id: str, scenario_id: str) -> str:
    offers = acquired_offers(conn, user_id, scenario_id)
    types = {o["acquisition_type"] for o in offers}
    if "PURCHASED" in types:
        return "PURCHASED"
    if "FREE_ACQUIRED" in types:
        return "FREE_ACQUIRED"
    ov = conn.execute("SELECT ownership_status FROM ownership_overrides WHERE user_id=? AND scenario_id=?", (user_id, scenario_id)).fetchone()
    if ov and ov[0] == "NOT_OWNED":
        return "NOT_PURCHASED"
    return "UNKNOWN"


@dataclass
class Ownership:
    status: str
    needs_review: bool = False
    reasons: list[str] = field(default_factory=list)


def ownership_status(conn, user_id: str, scenario_id: str) -> Ownership:
    offers = acquired_offers(conn, user_id, scenario_id)
    full = [o for o in offers if o["scope"] == "FULL" and o["coverage"] == "COMPLETE"
            and (o["variant_id"] is None or o["verification_status"] == "VERIFIED")]
    ov = conn.execute("SELECT ownership_status FROM ownership_overrides WHERE user_id=? AND scenario_id=?", (user_id, scenario_id)).fetchone()
    override = ov[0] if ov else None
    if override == "NOT_OWNED" and full:
        return Ownership("NOT_OWNED", True, ["override NOT_OWNED contradicts a verified full acquisition"])
    if override in ("OWNED", "NOT_OWNED"):
        return Ownership(override, False, ["explicit override"])
    if full:
        return Ownership("OWNED", False, [f"full acquisition {full[0]['acquisition_id']}"])
    reasons = ["only sample/asset acquisitions"] if offers else []
    return Ownership("UNKNOWN", False, reasons)
