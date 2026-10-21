"""Product -> scenario organization (Phase 1).

Each BOOTH product is classified by how it packages scenarios:

- SINGLE: one scenario (possibly several formats: PDF / text / room data).
- COLLECTION: an anthology / scenario collection sold as one page.
- SAME_PAGE_VARIANTS: one page sells a bundle and the member scenarios
  separately as variants.
- ASSET_ONLY: assets for a scenario (images, BGM, room data), no scenario text.
- UNDETERMINED: not enough signal; left for review.

Scenario rows get opaque IDs; a derivation key (scenario_keys) makes a re-run
reuse the same IDs. A hand-checked classification (method MANUAL, imported
from the review table) always wins over the rules.

Cross-product "same work" pairs (a scenario sold alone and also inside an
anthology) are only proposed in scenario_link_candidates. They are merged
only after a person confirms them (status CONFIRMED -> apply_confirmed_links).
"""
from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field

from .db import new_id, utcnow
from .rules import classify_edition_kind, lines

_COLLECTION_TITLE = re.compile(r"アンソロジー|アンソロ|シナリオ集|短編集|合同誌|合同本|詰め合わせ|オムニバス|anthology", re.I)
_MEMBERS_HEADING = re.compile(r"収録(作品|シナリオ|内容|作|タイトル|一覧)|収録されている|目次|contents", re.I)
_MEMBER_COUNT = re.compile(r"(?:全\s*)?(\d+)\s*(?:本|作品|作|編|シナリオ)(?:を)?\s*(?:収録|入り|セット)|収録数\s*[::]?\s*(\d+)")
_BUNDLE_LABEL = re.compile(r"セット|全部|まとめ|全\s*\d*\s*話|一式|全作|コンプリート|バンドル|全収録|合本|詰め合わせ|全シナリオ|set|bundle", re.I)
_FORMAT_LABEL = re.compile(r"PDF|テキスト|txt|word|版|部屋|ルーム|素材|付き|付|通常|フル|DL|ダウンロード|紙|書籍|冊子|物理|匿名配送|おまけ|支援|投げ銭|ブースト|データ|pack|edition", re.I)
_QUOTED = re.compile(r"[『「]([^』」]{1,60})[』」]")
_BULLET = re.compile(r"^(?:[・●○◆◇■□▼▽★☆※\-*]|\d+[.)．、]|[①-⑳]|第\s*\d+\s*話|No\.?\s*\d+)\s*")
_SCENARIO_SIGNAL = re.compile(r"シナリオ|scenario|クトゥルフ|CoC|エモクロア|TRPG|探索者|KP|PL", re.I)
_ASSET_SIGNAL = re.compile(r"素材|立ち絵|スチル|BGM|背景|アイコン|ルームデータ|部屋データ|ココフォリア|ユドナリウム|トレーラー|ハンドアウト素材|キャラシ|ダイス|グッズ", re.I)
_NOT_MEMBER = re.compile(r"注意|概要|あらすじ|推奨|システム|人数|時間|価格|形式|クレジット|更新|購入|利用|規約|その他|問い合わせ|ネタバレ|トレーラー|HO\d|特記")
_SYSTEM_WORDS = re.compile(r"^(新?クトゥルフ神話TRPG|エモクロアTRPG|CoC\s*\d?|TRPG)$", re.I)

# Tags that name a system (BOOTH tag text as seen on product pages).
_TAG_SYSTEMS = {"新クトゥルフ神話TRPG": "COC7", "エモクロアTRPG": "EMOKLORE", "エモクロア": "EMOKLORE"}


def normalize_title(title: str) -> str:
    """Comparison key only: NFKC, lower case, drop brackets/labels/spaces."""
    t = unicodedata.normalize("NFKC", title).lower()
    t = re.sub(r"[【\[(（<〈《].*?[】\])）>〉》]", "", t)
    t = re.sub(r"(coc|クトゥルフ神話trpg|新クトゥルフ|エモクロア|trpg|シナリオ|scenario|6版|7版|対応|pdf)", "", t)
    return re.sub(r"[\s・\-_~!?！？。、,.『』「」/／]+", "", t)


@dataclass
class Classification:
    kind: str
    members: list[str] = field(default_factory=list)
    member_count: int | None = None
    bundle_labels: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)
    method: str = "RULE"


def extract_member_titles(text: str) -> list[str]:
    """Titles listed under a 収録作品-style heading, or in a run of bulleted
    『』/「」 lines. Returns [] when nothing looks like a list."""
    ls = lines(text or "")
    found: list[str] = []

    def take(line: str) -> str | None:
        m = _QUOTED.search(line)
        if m:
            t = m.group(1).strip()
        elif re.match(r"^[■□◆◇【\[]", line) or _NOT_MEMBER.search(line):
            return None  # a section heading ends the list
        elif _BULLET.match(line):
            t = _BULLET.sub("", line)
            t = re.split(r"\s*[/／|｜]\s*|\s+(?:作|著|作者|執筆)\s*[::]|\s*[(（](?:作|著|執筆)", t)[0].strip()
        else:
            return None
        if not t or _SYSTEM_WORDS.match(t) or len(t) > 60:
            return None
        return t

    for i, ln in enumerate(ls):
        if _MEMBERS_HEADING.search(ln):
            run: list[str] = []
            # A heading line can itself hold the list ("収録作品：『A』『B』").
            run += [m.strip() for m in _QUOTED.findall(ln) if not _SYSTEM_WORDS.match(m.strip())]
            for nxt in ls[i + 1:i + 40]:
                t = take(nxt)
                if t is None:
                    if run:
                        break
                    continue
                run.append(t)
            if len(run) >= 2:
                found = run
                break
    if not found:
        # Fallback: the longest run of consecutive bulleted lines with a quoted title.
        run: list[str] = []
        best: list[str] = []
        for ln in ls:
            if _BULLET.match(ln) and _QUOTED.search(ln) and (t := take(ln)):
                run.append(t)
            else:
                best, run = (run if len(run) > len(best) else best), []
        best = run if len(run) > len(best) else best
        if len(best) >= 2:
            found = best
    seen, out = set(), []
    for t in found:
        k = normalize_title(t)
        if k and k not in seen:
            seen.add(k)
            out.append(t)
    return out


def _member_count_hint(text: str) -> int | None:
    m = _MEMBER_COUNT.search(unicodedata.normalize("NFKC", text or ""))
    if not m:
        return None
    n = int(m.group(1) or m.group(2))
    return n if 2 <= n <= 100 else None


def classify(title: str, description: str, variants: list[dict], tags: list[str], category: str | None = None) -> Classification:
    text = f"{title}\n{description or ''}"
    def kind(v):
        return v.get("edition_kind") or classify_edition_kind(v["variant_label"])

    full = [v for v in variants if kind(v) == "FULL"]
    # A variant named only by a quoted title (第一話『序』) is one work, even
    # though its label has no "scenario/PDF" word.
    titled = [v for v in variants if kind(v) == "UNKNOWN" and _QUOTED.search(v["variant_label"])]
    reasons: list[str] = []

    scenario_signal = (bool(_SCENARIO_SIGNAL.search(title)) or any(_SCENARIO_SIGNAL.search(t) for t in tags)
                       or bool(re.search(r"シナリオ", description or "")) or bool(_SCENARIO_SIGNAL.search(category or "")))
    if not scenario_signal:
        if _ASSET_SIGNAL.search(title):
            return Classification("ASSET_ONLY", reasons=["no scenario signal; asset words in title"])
        return Classification("UNDETERMINED", reasons=["no scenario signal"])
    if _ASSET_SIGNAL.search(title) and "シナリオ" not in title and not full:
        return Classification("ASSET_ONLY", reasons=["asset words in title, no full-scenario variant"])

    bundles = [v for v in full if _BUNDLE_LABEL.search(v["variant_label"])]
    singles = [v for v in full + titled if v not in bundles and (_QUOTED.search(v["variant_label"]) or not _FORMAT_LABEL.search(v["variant_label"]))]
    if bundles and singles:
        members = [m.group(1) if (m := _QUOTED.search(v["variant_label"])) else v["variant_label"] for v in singles]
        reasons.append(f"bundle variant(s) {[b['variant_label'] for b in bundles]} next to single variants")
        listed = extract_member_titles(description)
        if len(listed) > len(members):
            reasons.append(f"description lists {len(listed)} works; {len(listed) - len(members)} not sold separately here")
            members = listed
        return Classification("SAME_PAGE_VARIANTS", members=members, member_count=len(members),
                              bundle_labels=[b["variant_label"] for b in bundles], reasons=reasons)

    members = extract_member_titles(description)
    count_hint = _member_count_hint(text)
    if _COLLECTION_TITLE.search(title) or len(members) >= 2 or count_hint:
        if _COLLECTION_TITLE.search(title):
            reasons.append("collection word in title")
        if members:
            reasons.append(f"{len(members)} member titles listed in description")
        if count_hint:
            reasons.append(f"description states {count_hint} works")
        if not members and not count_hint:
            reasons.append("members not found: needs review")
        return Classification("COLLECTION", members=members, member_count=len(members) or count_hint, reasons=reasons)

    reasons.append("scenario signal, no collection signal")
    if len(full) >= 2:
        reasons.append(f"{len(full)} full variants read as formats of one work")
    return Classification("SINGLE", reasons=reasons)


# -- persistence --------------------------------------------------------------
def _product(conn, iid: int) -> dict:
    p = conn.execute("SELECT * FROM products WHERE booth_item_id=?", (iid,)).fetchone()
    variants = [dict(r) for r in conn.execute("SELECT * FROM product_variants WHERE booth_item_id=? ORDER BY rowid", (iid,))]
    tags = [r[0] for r in conn.execute("SELECT tag FROM product_tags WHERE booth_item_id=?", (iid,))]
    return {"product": dict(p), "variants": variants, "tags": tags}


def _scenario_for_key(conn, key: str, title: str, now: str) -> str:
    row = conn.execute("SELECT scenario_id FROM scenario_keys WHERE derivation_key=?", (key,)).fetchone()
    if row:
        # A merged scenario has several keys; keep its title stable then.
        if conn.execute("SELECT COUNT(*) FROM scenario_keys WHERE scenario_id=?", (row[0],)).fetchone()[0] == 1:
            conn.execute("UPDATE scenarios SET canonical_title=?, title_normalized=?, updated_at=? WHERE scenario_id=?",
                         (title, normalize_title(title), now, row[0]))
        return row[0]
    sid = new_id("SCN")
    conn.execute(
        "INSERT INTO scenarios (scenario_id, canonical_title, title_normalized, scenario_kind, created_at, updated_at) VALUES (?, ?, ?, 'UNKNOWN', ?, ?)",
        (sid, title, normalize_title(title), now, now),
    )
    conn.execute("INSERT INTO scenario_keys VALUES (?, ?)", (key, sid))
    return sid


def _collection_for_key(conn, key: str, title: str, ctype: str) -> str:
    row = conn.execute("SELECT collection_id FROM collection_keys WHERE derivation_key=?", (key,)).fetchone()
    if row:
        conn.execute("UPDATE collections SET title=?, collection_type=? WHERE collection_id=?", (title, ctype, row[0]))
        return row[0]
    cid = new_id("COL")
    conn.execute("INSERT INTO collections (collection_id, title, collection_type) VALUES (?, ?, ?)", (cid, title, ctype))
    conn.execute("INSERT INTO collection_keys VALUES (?, ?)", (key, cid))
    return cid


_SCENARIO_REF_TABLES = [
    "product_scenarios", "variant_scenarios", "scenario_sources", "collection_scenarios", "scenario_systems",
    "scenario_session_modes", "scenario_durations", "scenario_conditions", "scenario_assets", "sample_offers",
    "extraction_evidence", "acquisition_records", "ownership_overrides",
]


def _clear_item(conn, iid: int) -> None:
    """Remove everything organize derived from this product (not the scenario
    rows themselves; those are reused through their keys)."""
    ev = "SELECT evidence_id FROM extraction_evidence WHERE booth_item_id=?"
    var = "SELECT variant_id FROM product_variants WHERE booth_item_id=?"
    conn.execute(f"DELETE FROM variant_scenarios WHERE variant_id IN ({var})", (iid,))
    conn.execute("DELETE FROM product_scenarios WHERE booth_item_id=?", (iid,))
    conn.execute("DELETE FROM scenario_sources WHERE booth_item_id=?", (iid,))
    conn.execute("DELETE FROM sample_offers WHERE booth_item_id=?", (iid,))
    for t in ("scenario_systems", "scenario_session_modes", "scenario_durations", "scenario_conditions"):
        conn.execute(f"DELETE FROM {t} WHERE evidence_id IN ({ev})", (iid,))
    conn.execute(f"DELETE FROM scenario_assets WHERE evidence_id IN ({ev}) OR variant_id IN ({var})", (iid, iid))
    for (cid,) in conn.execute("SELECT collection_id FROM product_collections WHERE booth_item_id=?", (iid,)).fetchall():
        conn.execute("DELETE FROM collection_scenarios WHERE collection_id=?", (cid,))
    conn.execute("DELETE FROM product_collections WHERE booth_item_id=?", (iid,))
    conn.execute("UPDATE extraction_evidence SET scenario_id=NULL WHERE booth_item_id=?", (iid,))


def _drop_orphans(conn) -> None:
    refs = " AND ".join(f"NOT EXISTS (SELECT 1 FROM {t} x WHERE x.scenario_id = s.scenario_id)" for t in _SCENARIO_REF_TABLES)
    refs += " AND NOT EXISTS (SELECT 1 FROM scenario_link_candidates c WHERE c.status='CONFIRMED' AND s.scenario_id IN (c.scenario_id_a, c.scenario_id_b))"
    orphans = [r[0] for r in conn.execute(f"SELECT scenario_id FROM scenarios s WHERE {refs}")]
    for sid in orphans:
        conn.execute("DELETE FROM scenario_keys WHERE scenario_id=?", (sid,))
        conn.execute("DELETE FROM scenario_link_candidates WHERE ? IN (scenario_id_a, scenario_id_b)", (sid,))
        conn.execute("DELETE FROM scenarios WHERE scenario_id=?", (sid,))


def _evidence_hits(conn, iid: int) -> list[tuple[str, str, dict]]:
    out = []
    for r in conn.execute("SELECT evidence_id, field_path FROM extraction_evidence WHERE booth_item_id=? AND extraction_method IN ('REGEX','RULE')", (iid,)):
        table, _, payload = r["field_path"].partition(":")
        try:
            out.append((r["evidence_id"], table, json.loads(payload)))
        except json.JSONDecodeError:
            continue
    return out


def _attach_rule_facts(conn, iid: int, sid: str, *, systems_only: bool = False) -> None:
    for eid, table, v in _evidence_hits(conn, iid):
        if table == "scenario_systems":
            conn.execute("INSERT OR IGNORE INTO scenario_systems VALUES (?, ?, ?, ?)", (sid, v["system_code"], v["support_type"], eid))
        if systems_only:
            continue
        if table == "scenario_session_modes":
            conn.execute(
                "INSERT INTO scenario_session_modes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (new_id("SM"), sid, v["mode"], v.get("player_min"), v.get("player_max"), v.get("player_fixed"),
                 v.get("facilitator_role"), v.get("companion_role"), eid),
            )
        elif table == "scenario_durations":
            conn.execute(
                "INSERT INTO scenario_durations VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (new_id("DU"), sid, v["mode"], v["scope"], v["min_minutes"], v["max_minutes"], v.get("approximate", 0), eid),
            )
        elif table == "scenario_assets":
            conn.execute(
                "INSERT INTO scenario_assets (asset_id, scenario_id, asset_type, availability_relation, evidence_id) VALUES (?, ?, ?, ?, ?)",
                (new_id("AS"), sid, v["asset_type"], v["availability_relation"], eid),
            )
        else:
            continue
        conn.execute("UPDATE extraction_evidence SET scenario_id=? WHERE evidence_id=?", (sid, eid))


def _primary_system(conn, sid: str, tags: list[str]) -> str:
    native = [r[0] for r in conn.execute("SELECT system_code FROM scenario_systems WHERE scenario_id=? AND support_type='NATIVE'", (sid,))]
    if len(set(native)) == 1:
        return native[0]
    from_tags = {_TAG_SYSTEMS[t] for t in tags if t in _TAG_SYSTEMS}
    return from_tags.pop() if len(from_tags) == 1 else "UNKNOWN"


def _variant_coverage(v: dict) -> str | None:
    kind = v.get("edition_kind") or "UNKNOWN"
    return {"FULL": "COMPLETE", "FREE_PLAYABLE_EDITION": "COMPLETE", "SAMPLE": "SAMPLE", "ASSET_ONLY": "ASSET_ONLY"}.get(kind)


def stored_classification(conn, iid: int) -> Classification | None:
    r = conn.execute("SELECT * FROM product_classifications WHERE booth_item_id=?", (iid,)).fetchone()
    if not r:
        return None
    return Classification(r["product_kind"], json.loads(r["member_titles_json"] or "[]"), r["member_count"],
                          reasons=json.loads(r["reasons_json"] or "[]"), method=r["method"])


def organize_item(conn, iid: int) -> Classification:
    data = _product(conn, iid)
    p, variants, tags = data["product"], data["variants"], data["tags"]
    now = utcnow()
    manual = stored_classification(conn, iid)
    if manual and manual.method == "MANUAL":
        cls = manual
        if cls.kind == "SAME_PAGE_VARIANTS" and not cls.bundle_labels:
            cls.bundle_labels = [v["variant_label"] for v in variants if _BUNDLE_LABEL.search(v["variant_label"])]
    else:
        cls = classify(p["title"] or p["listing_title"] or "", p["description_text"] or "", variants, tags, p["category_name"])
        conn.execute(
            "INSERT OR REPLACE INTO product_classifications VALUES (?, ?, ?, ?, 'RULE', ?, ?)",
            (iid, cls.kind, cls.member_count, json.dumps(cls.members, ensure_ascii=False), json.dumps(cls.reasons, ensure_ascii=False), now),
        )
    _clear_item(conn, iid)
    title = p["title"] or p["listing_title"] or f"item {iid}"
    url = p["product_url"]

    if cls.kind == "SINGLE":
        sid = _scenario_for_key(conn, f"item:{iid}:single", title, now)
        conn.execute("UPDATE scenarios SET scenario_kind='SINGLE' WHERE scenario_id=?", (sid,))
        conn.execute("INSERT OR IGNORE INTO product_scenarios VALUES (?, ?, 'STANDALONE')", (iid, sid))
        conn.execute("INSERT OR IGNORE INTO scenario_sources VALUES (?, ?, ?, ?, 'STANDALONE', 1)", (new_id("SRC"), sid, url, iid))
        for v in variants:
            if cov := _variant_coverage(v):
                conn.execute("INSERT OR IGNORE INTO variant_scenarios VALUES (?, ?, ?, 'INFERRED')", (v["variant_id"], sid, cov))
            if v["edition_kind"] == "SAMPLE":
                conn.execute(
                    "INSERT INTO sample_offers (sample_id, booth_item_id, variant_id, scenario_id, sample_type, price_jpy, availability) VALUES (?, ?, ?, ?, 'PREVIEW_PDF', ?, ?)",
                    (new_id("SMP"), iid, v["variant_id"], sid, v["price_jpy"], "AVAILABLE" if v["availability"] == "AVAILABLE" else "UNKNOWN"),
                )
        _attach_rule_facts(conn, iid, sid)
        conn.execute("UPDATE scenarios SET system_primary=? WHERE scenario_id=?", (_primary_system(conn, sid, tags), sid))

    elif cls.kind in ("COLLECTION", "SAME_PAGE_VARIANTS"):
        cid = _collection_for_key(conn, f"item:{iid}:collection", title, "ANTHOLOGY" if cls.kind == "COLLECTION" else "COLLECTION_BUNDLE")
        conn.execute("INSERT OR IGNORE INTO product_collections VALUES (?, ?, 'FULL_COLLECTION')", (iid, cid))
        member_ids: list[tuple[str, str]] = []
        for order, mt in enumerate(cls.members, 1):
            sid = _scenario_for_key(conn, f"item:{iid}:member:{normalize_title(mt) or mt}", mt, now)
            member_ids.append((mt, sid))
            conn.execute("INSERT OR IGNORE INTO collection_scenarios VALUES (?, ?, ?, ?)", (cid, sid, order, mt))
            conn.execute("INSERT OR IGNORE INTO product_scenarios VALUES (?, ?, 'COLLECTION_MEMBER')", (iid, sid))
            conn.execute("INSERT OR IGNORE INTO scenario_sources VALUES (?, ?, ?, ?, 'COLLECTION', 0)", (new_id("SRC"), sid, url, iid))
            # Systems are nearly always shared by an anthology's works; player count
            # and play time differ per work, so they stay on the product only.
            _attach_rule_facts(conn, iid, sid, systems_only=True)
            conn.execute("UPDATE scenarios SET system_primary=? WHERE scenario_id=?", (_primary_system(conn, sid, tags), sid))
        bundle_norm = {normalize_title(b) for b in cls.bundle_labels}
        for v in variants:
            cov = _variant_coverage(v)
            if v["edition_kind"] == "SAMPLE":
                # Collection-scoped until it is verified which works it previews.
                conn.execute(
                    "INSERT INTO sample_offers (sample_id, booth_item_id, variant_id, collection_id, sample_type, price_jpy, availability) VALUES (?, ?, ?, ?, 'PREVIEW_PDF', ?, ?)",
                    (new_id("SMP"), iid, v["variant_id"], cid, v["price_jpy"], "AVAILABLE" if v["availability"] == "AVAILABLE" else "UNKNOWN"),
                )
                continue
            if cov is None and cls.kind == "SAME_PAGE_VARIANTS" and v["edition_kind"] == "UNKNOWN" and _QUOTED.search(v["variant_label"]):
                cov = "COMPLETE"
            if cov is None:
                continue
            label_norm = normalize_title(v["variant_label"])
            own = [sid for mt, sid in member_ids if normalize_title(mt) and normalize_title(mt) in label_norm]
            if cls.kind == "SAME_PAGE_VARIANTS" and label_norm not in bundle_norm and len(own) == 1:
                conn.execute("INSERT OR IGNORE INTO variant_scenarios VALUES (?, ?, ?, 'INFERRED')", (v["variant_id"], own[0], cov))
                conn.execute("UPDATE scenario_sources SET source_type='STANDALONE' WHERE scenario_id=? AND booth_item_id=?", (own[0], iid))
            else:
                for _, sid in member_ids:
                    conn.execute("INSERT OR IGNORE INTO variant_scenarios VALUES (?, ?, ?, 'INFERRED')", (v["variant_id"], sid, cov))

    _drop_orphans(conn)
    conn.commit()
    return cls


def organize_all(conn, only_fetched: bool = True) -> dict:
    where = "WHERE detail_fetched_at IS NOT NULL" if only_fetched else ""
    counts: dict[str, int] = {}
    for (iid,) in conn.execute(f"SELECT booth_item_id FROM products {where} ORDER BY booth_item_id").fetchall():
        k = organize_item(conn, iid).kind
        counts[k] = counts.get(k, 0) + 1
    counts["link_candidates_added"] = propose_links(conn)
    return counts


# -- cross-product links --------------------------------------------------------
def propose_links(conn) -> int:
    """Pair collection members with standalone scenarios of the same title.
    Same shop -> 0.9, different shop -> 0.5. Only exact normalized-title matches
    (or containment within one shop) are proposed; nothing is merged."""
    singles = conn.execute(
        """SELECT s.scenario_id, s.title_normalized, p.publisher_id, ps.booth_item_id
           FROM scenarios s JOIN product_scenarios ps ON ps.scenario_id=s.scenario_id AND ps.relation_type='STANDALONE'
           JOIN products p ON p.booth_item_id=ps.booth_item_id WHERE COALESCE(s.title_normalized,'') != ''"""
    ).fetchall()
    members = conn.execute(
        """SELECT s.scenario_id, s.title_normalized, p.publisher_id, ps.booth_item_id
           FROM scenarios s JOIN product_scenarios ps ON ps.scenario_id=s.scenario_id AND ps.relation_type='COLLECTION_MEMBER'
           JOIN products p ON p.booth_item_id=ps.booth_item_id WHERE COALESCE(s.title_normalized,'') != ''"""
    ).fetchall()
    by_title: dict[str, list] = {}
    by_shop: dict[str, list] = {}
    for s in singles:
        by_title.setdefault(s["title_normalized"], []).append(s)
        if s["publisher_id"]:
            by_shop.setdefault(s["publisher_id"], []).append(s)
    added = 0
    for m in members:
        cands = {s["scenario_id"]: s for s in by_title.get(m["title_normalized"], [])}
        for s in by_shop.get(m["publisher_id"] or "", []):
            a, b = m["title_normalized"], s["title_normalized"]
            if min(len(a), len(b)) >= 4 and (a in b or b in a):
                cands.setdefault(s["scenario_id"], s)
        for s in cands.values():
            if s["booth_item_id"] == m["booth_item_id"] or s["scenario_id"] == m["scenario_id"]:
                continue
            same_shop = bool(m["publisher_id"]) and m["publisher_id"] == s["publisher_id"]
            exact = m["title_normalized"] == s["title_normalized"]
            score = (0.9 if same_shop else 0.5) - (0 if exact else 0.2)
            reasons = {"member_item": m["booth_item_id"], "single_item": s["booth_item_id"], "same_shop": same_shop, "exact_title": exact}
            cur = conn.execute(
                "INSERT OR IGNORE INTO scenario_link_candidates VALUES (?, ?, ?, 'SAME_WORK', ?, ?, 'PENDING', ?)",
                (new_id("LNK"), s["scenario_id"], m["scenario_id"], round(score, 2), json.dumps(reasons, ensure_ascii=False), utcnow()),
            )
            added += cur.rowcount
    conn.commit()
    return added


def apply_confirmed_links(conn) -> int:
    """Merge each CONFIRMED SAME_WORK pair: scenario b's rows move to a."""
    merged = 0
    for c in conn.execute("SELECT * FROM scenario_link_candidates WHERE status='CONFIRMED' AND relation='SAME_WORK'").fetchall():
        a, b = c["scenario_id_a"], c["scenario_id_b"]
        if a == b or not conn.execute("SELECT 1 FROM scenarios WHERE scenario_id=?", (b,)).fetchone():
            continue
        for t in _SCENARIO_REF_TABLES:
            conn.execute(f"UPDATE OR IGNORE {t} SET scenario_id=? WHERE scenario_id=?", (a, b))
            conn.execute(f"DELETE FROM {t} WHERE scenario_id=?", (b,))
        # b's derivation keys now resolve to a, so re-organizing keeps the merge.
        conn.execute("UPDATE scenario_keys SET scenario_id=? WHERE scenario_id=?", (a, b))
        conn.execute("DELETE FROM scenario_link_candidates WHERE candidate_id=?", (c["candidate_id"],))
        for col in ("scenario_id_a", "scenario_id_b"):
            conn.execute(f"UPDATE OR IGNORE scenario_link_candidates SET {col}=? WHERE {col}=?", (a, b))
            conn.execute(f"DELETE FROM scenario_link_candidates WHERE {col}=?", (b,))
        conn.execute("DELETE FROM scenario_link_candidates WHERE scenario_id_a = scenario_id_b")
        conn.execute("DELETE FROM scenarios WHERE scenario_id=?", (b,))
        merged += 1
    conn.commit()
    return merged
