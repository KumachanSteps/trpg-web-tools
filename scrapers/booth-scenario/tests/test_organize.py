import json

from booth_scenario import organize, review, store
from booth_scenario.organize import classify, extract_member_titles


def V(label, price=500, kind=None):
    from booth_scenario.rules import classify_edition_kind
    return {"variant_label": label, "price_jpy": price, "edition_kind": kind or classify_edition_kind(label), "availability": "AVAILABLE"}


def test_single_with_format_variants():
    c = classify("【CoC6版シナリオ】霧の館", "推奨人数：1PL", [V("PDF版"), V("ココフォリア部屋付き", 1000), V("お試し版", 0)], ["クトゥルフ神話TRPG"])
    assert c.kind == "SINGLE"


def test_anthology_members_from_description():
    desc = "■収録作品\n・『赤い部屋』／作：A\n・『青い森』（作：B）\n・『黒い海』\n■注意事項\nネタバレ禁止"
    c = classify("CoCシナリオアンソロジー 色", desc, [V("PDF", 1500)], [])
    assert c.kind == "COLLECTION" and c.members == ["赤い部屋", "青い森", "黒い海"]


def test_collection_without_listed_members_needs_review():
    c = classify("短編シナリオ集", "全5本収録のシナリオ集です", [V("本編PDF")], [])
    assert c.kind == "COLLECTION" and c.member_count == 5 and c.members == []


def test_same_page_bundle_and_singles():
    c = classify("CoCシナリオ三部作", "", [V("全話セット", 2000), V("第一話『序』", 800), V("第二話『破』", 800)], [])
    assert c.kind == "SAME_PAGE_VARIANTS" and c.members == ["序", "破"]


def test_asset_only():
    c = classify("NPC立ち絵素材集", "", [V("素材", 300, "ASSET_ONLY")], [])
    assert c.kind == "ASSET_ONLY"


def test_member_list_ignores_system_names():
    assert extract_member_titles("収録作品：『クトゥルフ神話TRPG』\n・『A館』\n・『B塔』") == ["A館", "B塔"]


# -- persistence ------------------------------------------------------------------
def _item(conn, iid, title, desc, variants, shop="S", shop_url="https://s.booth.pm/", tags=None):
    raw = json.dumps({"id": iid, "name": title, "description": desc, "shop": {"name": shop, "url": shop_url},
                      "tags": [{"name": t} for t in tags or []],
                      "variations": [{"id": iid * 10 + i, "name": n, "price": p, "status": "addable_to_cart" if p else "free_download"} for i, (n, p) in enumerate(variants)]})
    from booth_scenario.evidence import rebuild_evidence
    from booth_scenario.parsers.detail import parse_item_json
    rec = parse_item_json(raw, iid)
    store.save_detail(conn, rec, "2026-10-21T00:00:00+00:00", raw)
    rebuild_evidence(conn, iid)


def test_member_list_skips_prose_quotes_and_foreign_urls():
    text = "\n".join([
        "●収録シナリオ", "『海の部屋』", "『花を探して』", "『渚の手紙』",
        "本書は『前作』(https://x.booth.pm/items/588090)を経た探索者向け。",
        "・『前作』からKPは続投", "・『前作』以外で回す", "デザイン協力：山田",
    ])
    titles, items = organize.extract_members(text)
    assert titles == ["海の部屋", "花を探して", "渚の手紙"]
    assert items == {}


def test_member_url_on_its_own_next_line():
    text = "収録作品\n「海の部屋」作:A\nhttps://x.booth.pm/items/11\n「花を探して」作:B\n"
    assert organize.extract_members(text)[1] == {"海の部屋": 11}


def test_single_builds_scenario_and_is_idempotent(conn):
    _item(conn, 1, "霧の館", "システム：新クトゥルフ神話TRPG\n推奨人数：1PL（KPC同行）\nボイセ3時間", [("本編PDF", 1000), ("お試し版", 0)],
          tags=["新クトゥルフ神話TRPG"])
    organize.organize_item(conn, 1)
    sid1 = conn.execute("SELECT scenario_id FROM product_scenarios WHERE booth_item_id=1").fetchone()[0]
    organize.organize_item(conn, 1)
    assert conn.execute("SELECT scenario_id FROM product_scenarios WHERE booth_item_id=1").fetchone()[0] == sid1
    assert conn.execute("SELECT COUNT(*) FROM scenarios").fetchone()[0] == 1
    s = conn.execute("SELECT * FROM scenarios").fetchone()
    assert s["system_primary"] == "COC7" and s["scenario_kind"] == "SINGLE"
    assert conn.execute("SELECT mode FROM scenario_session_modes").fetchone()[0] == "ONE_ON_ONE"
    assert conn.execute("SELECT COUNT(*) FROM scenario_durations").fetchone()[0] == 1
    from booth_scenario import projections as pj
    assert pj.has_free_sample(conn, sid1) is True and pj.is_scenario_free(conn, sid1) is False


def test_anthology_and_standalone_link_then_merge(conn):
    _item(conn, 2, "シナリオアンソロジー", "収録作品\n・『赤い部屋』\n・『青い森』\nシステム：クトゥルフ神話TRPG", [("PDF", 1500), ("サンプル", 0)])
    _item(conn, 3, "赤い部屋", "CoCシナリオ\n推奨人数：2~4人", [("PDF", 700)])
    res = organize.organize_all(conn)
    assert res["COLLECTION"] == 1 and res["SINGLE"] == 1 and res["link_candidates_added"] == 1
    # Collection sample stays collection-scoped.
    assert conn.execute("SELECT collection_id IS NOT NULL AND scenario_id IS NULL FROM sample_offers").fetchone()[0] == 1
    # Not merged until confirmed.
    assert conn.execute("SELECT COUNT(*) FROM scenarios").fetchone()[0] == 3
    assert review.auto_fields(conn, 3)["related_items"] == "2"
    conn.execute("UPDATE scenario_link_candidates SET status='CONFIRMED'")
    assert organize.apply_confirmed_links(conn) == 1
    assert conn.execute("SELECT COUNT(*) FROM scenarios").fetchone()[0] == 2
    organize.organize_all(conn)  # re-run keeps the merge
    assert conn.execute("SELECT COUNT(*) FROM scenarios").fetchone()[0] == 2
    red = conn.execute("SELECT scenario_id FROM product_scenarios WHERE booth_item_id=3").fetchone()[0]
    types = {r[0] for r in conn.execute("SELECT source_type FROM scenario_sources WHERE scenario_id=?", (red,))}
    assert types == {"STANDALONE", "COLLECTION"}
    assert conn.execute("PRAGMA foreign_key_check").fetchall() == []


def test_same_page_variants_coverage(conn):
    _item(conn, 4, "三部作シナリオ", "", [("全話セット", 2000), ("第一話『序』", 800), ("第二話『破』", 800)])
    assert organize.organize_item(conn, 4).kind == "SAME_PAGE_VARIANTS"
    cov = conn.execute(
        """SELECT pv.variant_label, COUNT(*) FROM variant_scenarios vs JOIN product_variants pv USING(variant_id) GROUP BY pv.variant_label""").fetchall()
    assert dict((r[0], r[1]) for r in cov) == {"全話セット": 2, "第一話『序』": 1, "第二話『破』": 1}


def test_manual_classification_wins(conn):
    _item(conn, 5, "霧の館", "", [("PDF", 500)])
    conn.execute("INSERT INTO product_classifications (booth_item_id, product_kind, member_count, member_titles_json, method, reasons_json, classified_at) VALUES (5, 'COLLECTION', 2, ?, 'MANUAL', '[]', 't')", (json.dumps(["A", "B"]),))
    assert organize.organize_item(conn, 5).kind == "COLLECTION"
    assert conn.execute("SELECT COUNT(*) FROM collection_scenarios").fetchone()[0] == 2


def test_refetch_replaces_tags_and_rule_facts(conn):
    _item(conn, 30, "霧の館", "新クトゥルフ神話TRPG対応シナリオ", [("PDF", 500)], tags=["CoC"])
    organize.organize_item(conn, 30)
    _item(conn, 30, "霧の館", "エモクロアTRPG対応シナリオ", [("PDF", 500)], tags=[])
    organize.organize_item(conn, 30)
    assert conn.execute("SELECT COUNT(*) FROM product_tags WHERE booth_item_id=30").fetchone()[0] == 0
    systems = conn.execute(
        "SELECT DISTINCT system_code FROM scenario_systems JOIN product_scenarios USING(scenario_id) WHERE booth_item_id=30").fetchall()
    assert [r[0] for r in systems] == ["EMOKLORE"]
