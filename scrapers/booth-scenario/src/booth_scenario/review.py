"""Review table: export what the rules extracted, take back a hand-checked copy
as ground truth, and measure the rules against it.

CSV layout: one row per product. For each checked field there is an `auto_*`
column (what the tool found) and an `ok_*` column. Leave `ok_*` empty when the
auto value is right; otherwise write the right value ("-" = none).
"""
from __future__ import annotations

import csv
import json
import random
import re
from pathlib import Path

from . import targets
from .db import utcnow
from .organize import normalize_title

FIELDS = ["product_kind", "members", "systems", "session_modes", "durations", "assets", "free_full", "free_sample", "related_items"]
LIST_SEP = "; "
MEMBER_SEP = "／"
FIELD_HELP = {
    "product_kind": "SINGLE / COLLECTION / SAME_PAGE_VARIANTS / ASSET_ONLY / UNDETERMINED",
    "members": "収録作品のタイトルを／区切り（単品は空欄のまま）",
    "systems": "COC6 / COC7 / EMOKLORE / OTHER と NATIVE / SUPPORTED / CONVERTIBLE / CONVERSION_PATCH を : でつなぎ ; 区切り",
    "session_modes": "例: ONE_ON_ONE 1-1 KP/KPC ; MULTI_PL 2-4 KP/UNKNOWN",
    "durations": "例: VOICE MAIN 180-240 ; TEXT UNSPECIFIED 480-480（分）",
    "assets": "例: NPC_IMAGE:INCLUDED ; BGM_AUDIO:EXPLICITLY_ABSENT",
    "free_full": "yes / no / unknown（本編を無料で入手できるか）",
    "free_sample": "yes / no / unknown（無料サンプルがあるか）",
    "related_items": "同じ作品を売っている別商品のID ; 区切り（例: 3403696）",
}


# -- selection --------------------------------------------------------------------
_COLLECTIONISH = re.compile(r"アンソロジー|アンソロ|シナリオ集|短編集|合同|セット|詰め合わせ|収録", re.I)


def pick_review_set(conn, n: int = 50, seed: int = 20261021) -> list[int]:
    """The 27 handoff samples first, then listing items chosen to cover kinds:
    collection-looking titles, free, multi-variant (N JPY~), then the rest."""
    chosen: list[int] = []
    for group in targets.SAMPLE_IDS.values():
        chosen += [i for i in group if i not in chosen]
    rng = random.Random(seed)
    rows = conn.execute(
        "SELECT booth_item_id, listing_title, listing_price_jpy, listing_price_multi FROM products WHERE listing_title IS NOT NULL ORDER BY booth_item_id"
    ).fetchall()
    pool = [r for r in rows if r["booth_item_id"] not in chosen]
    rng.shuffle(pool)
    buckets = [
        [r for r in pool if _COLLECTIONISH.search(r["listing_title"] or "")],
        [r for r in pool if r["listing_price_jpy"] == 0],
        [r for r in pool if r["listing_price_multi"] == 1],
        pool,
    ]
    quotas = [8, 5, 5, n]
    for bucket, quota in zip(buckets, quotas):
        taken = 0
        for r in bucket:
            if len(chosen) >= n or taken >= quota:
                break
            if r["booth_item_id"] not in chosen:
                chosen.append(r["booth_item_id"])
                taken += 1
    return chosen[:n]


# -- auto values --------------------------------------------------------------------
def _evidence_values(conn, iid: int, table: str) -> list[dict]:
    out = []
    for (fp,) in conn.execute("SELECT field_path FROM extraction_evidence WHERE booth_item_id=? AND field_path LIKE ?", (iid, f"{table}:%")):
        out.append(json.loads(fp.partition(":")[2]))
    return out


def _uniq_sorted(vals) -> str:
    return LIST_SEP.join(sorted(set(vals)))


def auto_fields(conn, iid: int) -> dict[str, str]:
    cls = conn.execute("SELECT * FROM product_classifications WHERE booth_item_id=?", (iid,)).fetchone()
    members = json.loads(cls["member_titles_json"] or "[]") if cls else []
    variants = conn.execute("SELECT * FROM product_variants WHERE booth_item_id=?", (iid,)).fetchall()
    fetched = conn.execute("SELECT detail_fetched_at FROM products WHERE booth_item_id=?", (iid,)).fetchone()[0]

    full = [v for v in variants if v["edition_kind"] in ("FULL", "FREE_PLAYABLE_EDITION")]
    if any(v["price_jpy"] == 0 and v["availability"] == "AVAILABLE" for v in full):
        free_full = "yes"
    elif fetched and full and all(v["price_jpy"] is not None for v in full):
        free_full = "no"
    else:
        free_full = "unknown"
    if any(v["edition_kind"] == "SAMPLE" and v["price_jpy"] == 0 for v in variants):
        free_sample = "yes"
    else:
        free_sample = "no" if fetched else "unknown"

    related = conn.execute(
        """SELECT DISTINCT ps2.booth_item_id FROM product_scenarios ps
           JOIN scenario_link_candidates c ON ps.scenario_id IN (c.scenario_id_a, c.scenario_id_b) AND c.status != 'REJECTED'
           JOIN product_scenarios ps2 ON ps2.scenario_id IN (c.scenario_id_a, c.scenario_id_b) AND ps2.booth_item_id != ps.booth_item_id
           WHERE ps.booth_item_id=?""",
        (iid,),
    ).fetchall()
    return {
        "product_kind": cls["product_kind"] if cls else "UNDETERMINED",
        "members": MEMBER_SEP.join(members),
        "systems": _uniq_sorted(f"{v['system_code']}:{v['support_type']}" for v in _evidence_values(conn, iid, "scenario_systems")),
        "session_modes": _uniq_sorted(
            f"{v['mode']} {v.get('player_min')}-{v.get('player_max')} {v.get('facilitator_role')}/{v.get('companion_role')}"
            for v in _evidence_values(conn, iid, "scenario_session_modes")),
        "durations": _uniq_sorted(
            f"{v['mode']} {v['scope']} {v['min_minutes']}-{v['max_minutes']}" for v in _evidence_values(conn, iid, "scenario_durations")),
        "assets": _uniq_sorted(f"{v['asset_type']}:{v['availability_relation']}" for v in _evidence_values(conn, iid, "scenario_assets")),
        "free_full": free_full,
        "free_sample": free_sample,
        "related_items": _uniq_sorted(str(r[0]) for r in related),
    }


# -- export / import --------------------------------------------------------------------
def export_review(conn, ids: list[int], path: Path) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    header = ["booth_item_id", "url", "title", "shop", "tags", "variants"]
    for f in FIELDS:
        header += [f"auto_{f}", f"ok_{f}"]
    header += ["notes"]
    n = 0
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        # Second row explains each ok_ column; import skips it.
        help_row = ["#説明", "", "", "", "", "ラベル | 価格 | 種類 | 在庫"]
        for f in FIELDS:
            help_row += ["", FIELD_HELP[f]]
        w.writerow(help_row + ["自由記述"])
        for iid in ids:
            p = conn.execute(
                """SELECT p.*, pub.shop_name FROM products p LEFT JOIN publishers pub USING(publisher_id) WHERE booth_item_id=?""", (iid,)
            ).fetchone()
            if p is None:
                continue
            variants = conn.execute("SELECT * FROM product_variants WHERE booth_item_id=? ORDER BY rowid", (iid,)).fetchall()
            vtext = "\n".join(f"{v['variant_label']} | {v['price_jpy'] if v['price_jpy'] is not None else '?'} | {v['edition_kind']} | {v['availability']}" for v in variants)
            tags = ", ".join(r[0] for r in conn.execute("SELECT tag FROM product_tags WHERE booth_item_id=?", (iid,)))
            auto = auto_fields(conn, iid)
            row = [iid, p["product_url"], p["title"] or p["listing_title"] or "", p["shop_name"] or "", tags, vtext]
            for f in FIELDS:
                row += [auto[f], ""]
            w.writerow(row + [""])
            n += 1
    return n


def _norm_value(field: str, value: str) -> frozenset:
    value = (value or "").strip()
    if value in ("", "-"):
        return frozenset()
    if field == "members":
        return frozenset(normalize_title(t) for t in re.split(r"[／/]", value) if t.strip())
    parts = re.split(r"\s*;\s*|\n", value)
    return frozenset(re.sub(r"\s+", " ", p.strip()).upper() for p in parts if p.strip())


def import_review(conn, path: Path) -> dict:
    """Store the checked table as review_labels; a corrected kind or member list
    becomes a MANUAL classification that organize will follow."""
    imported, corrected = 0, 0
    with path.open(encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh):
            iid_s = (row.get("booth_item_id") or "").strip()
            if not iid_s.isdigit():
                continue
            iid = int(iid_s)
            if not conn.execute("SELECT 1 FROM products WHERE booth_item_id=?", (iid,)).fetchone():
                continue
            labels = {}
            for f in FIELDS:
                auto, ok = row.get(f"auto_{f}", ""), (row.get(f"ok_{f}") or "").strip()
                labels[f] = {"auto": auto, "truth": auto if ok == "" else ("" if ok == "-" else ok), "corrected": ok != ""}
                corrected += ok != ""
            conn.execute("INSERT OR REPLACE INTO review_labels VALUES (?, ?, ?, ?)",
                         (iid, json.dumps(labels, ensure_ascii=False), row.get("notes") or None, utcnow()))
            if labels["product_kind"]["corrected"] or labels["members"]["corrected"]:
                members = [t.strip() for t in re.split(r"[／/]", labels["members"]["truth"]) if t.strip()]
                conn.execute(
                    "INSERT OR REPLACE INTO product_classifications VALUES (?, ?, ?, ?, 'MANUAL', ?, ?)",
                    (iid, labels["product_kind"]["truth"].strip().upper(), len(members) or None,
                     json.dumps(members, ensure_ascii=False), json.dumps(["from review table"]), utcnow()),
                )
            imported += 1
    conn.commit()
    return {"imported": imported, "corrected_cells": corrected}


def evaluate(conn) -> dict:
    """Compare the current rule output with the reviewed truth, per field.
    MANUAL classifications are compared against their own rule result, so the
    score measures the rules, not the corrections."""
    from .organize import classify, _product

    per_field = {f: {"checked": 0, "correct": 0, "misses": []} for f in FIELDS}
    for r in conn.execute("SELECT * FROM review_labels").fetchall():
        iid = r["booth_item_id"]
        labels = json.loads(r["labels_json"])
        now = auto_fields(conn, iid)
        data = _product(conn, iid)
        rule = classify(data["product"]["title"] or "", data["product"]["description_text"] or "", data["variants"], data["tags"],
                        data["product"]["category_name"])
        now["product_kind"], now["members"] = rule.kind, MEMBER_SEP.join(rule.members)
        for f in FIELDS:
            if f not in labels:
                continue
            st = per_field[f]
            st["checked"] += 1
            if _norm_value(f, now[f]) == _norm_value(f, labels[f]["truth"]):
                st["correct"] += 1
            else:
                st["misses"].append({"booth_item_id": iid, "tool": now[f], "truth": labels[f]["truth"]})
    for st in per_field.values():
        st["accuracy"] = round(st["correct"] / st["checked"], 3) if st["checked"] else None
    return per_field


def save_set(ids: list[int], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(ids), encoding="utf-8")


def load_set(path: Path) -> list[int]:
    return json.loads(path.read_text(encoding="utf-8"))
