"""SCHEMA_SPEC 'Phase 0 acceptance tests' on synthetic data."""
from booth_scenario import projections as pj
from booth_scenario import store
from booth_scenario.db import utcnow


def _acq(conn, aid, variant=None, scenario=None, typ="PURCHASED", scope="FULL", user="u1"):
    conn.execute("INSERT INTO acquisition_records (acquisition_id, user_id, variant_id, scenario_id, acquisition_type, scope) VALUES (?,?,?,?,?,?)",
                 (aid, user, variant, scenario, typ, scope))


def test_synthetic_fixture_expectations(conn, synthetic):
    store.load_synthetic_fixture(conn, synthetic)
    exp = synthetic["expected"]
    assert pj.is_scenario_free(conn, "SCN-TEST-A") is exp["scenario_a_free"]
    assert pj.has_free_sample(conn, "SCN-TEST-A") is exp["scenario_a_has_free_sample"]
    assert pj.is_scenario_free(conn, "SCN-TEST-B") is exp["scenario_b_free"]
    # A sample acquisition must not imply ownership.
    _acq(conn, "ACQ-S", variant="VAR-TEST-SAMPLE", typ="FREE_ACQUIRED", scope="SAMPLE")
    assert (pj.ownership_status(conn, "u1", "SCN-TEST-A").status == "OWNED") is exp["sample_acquisition_implies_owned"]
    assert pj.purchase_status(conn, "u1", "SCN-TEST-A") == "FREE_ACQUIRED"
    # Bundle acquisition covers both works.
    _acq(conn, "ACQ-B", variant="VAR-TEST-BUNDLE")
    covered = [s for s in ("SCN-TEST-A", "SCN-TEST-B") if pj.ownership_status(conn, "u1", s).status == "OWNED"]
    assert covered == exp["bundle_acquisition_covers"]


def _single(conn, item=1, price_full=500, sample=True, full_avail="AVAILABLE", fetched=True):
    store.ensure_product(conn, item)
    if fetched:
        conn.execute("UPDATE products SET detail_fetched_at=? WHERE booth_item_id=?", (utcnow(), item))
    now = utcnow()
    conn.execute("INSERT INTO scenarios (scenario_id, canonical_title, created_at, updated_at) VALUES ('S1','t',?,?)", (now, now))
    conn.execute("INSERT INTO product_scenarios VALUES (?, 'S1', 'STANDALONE')", (item,))
    conn.execute("INSERT INTO product_variants (variant_id, booth_item_id, variant_label, price_jpy, availability, edition_kind) VALUES ('VF', ?, 'PDF', ?, ?, 'FULL')", (item, price_full, full_avail))
    conn.execute("INSERT INTO variant_scenarios VALUES ('VF','S1','COMPLETE','VERIFIED')")
    if sample:
        conn.execute("INSERT INTO product_variants (variant_id, booth_item_id, variant_label, price_jpy, availability, edition_kind) VALUES ('VS', ?, 'お試し版', 0, 'AVAILABLE', 'SAMPLE')", (item,))
        conn.execute("INSERT INTO variant_scenarios VALUES ('VS','S1','SAMPLE','VERIFIED')")


def test_paid_full_with_free_preview(conn):
    _single(conn)
    assert pj.is_scenario_free(conn, "S1") is False
    assert pj.has_free_sample(conn, "S1") is True
    _acq(conn, "A1", variant="VS", typ="FREE_ACQUIRED", scope="SAMPLE")
    assert pj.ownership_status(conn, "u1", "S1").status == "UNKNOWN"


def test_free_full_with_paid_assets_no_auto_ownership(conn):
    _single(conn, price_full=0, sample=False)
    conn.execute("INSERT INTO product_variants (variant_id, booth_item_id, variant_label, price_jpy, availability, edition_kind) VALUES ('VA', 1, '素材セット', 300, 'AVAILABLE', 'ASSET_ONLY')")
    conn.execute("INSERT INTO variant_scenarios VALUES ('VA','S1','ASSET_ONLY','VERIFIED')")
    assert pj.is_scenario_free(conn, "S1") is True
    assert pj.ownership_status(conn, "u1", "S1").status == "UNKNOWN"
    assert pj.purchase_status(conn, "u1", "S1") == "UNKNOWN"


def test_unfetched_product_stays_unknown(conn):
    _single(conn, sample=False, fetched=False)
    assert pj.is_scenario_free(conn, "S1") is None
    assert pj.has_free_sample(conn, "S1") is None


def test_sold_out_free_version_is_not_free(conn):
    _single(conn, price_full=0, sample=False, full_avail="SOLD_OUT")
    assert pj.is_scenario_free(conn, "S1") is False


def test_bundle_sample_stays_collection_scoped(conn, synthetic):
    store.load_synthetic_fixture(conn, synthetic)
    conn.execute("INSERT INTO sample_offers (sample_id, booth_item_id, collection_id, sample_type, price_jpy, availability) VALUES ('SO1', 99999999, 'COL-TEST-1', 'PREVIEW_PDF', 0, 'AVAILABLE')")
    assert pj.has_free_sample(conn, "SCN-TEST-B") is False
    assert pj.has_free_sample(conn, "SCN-TEST-B", include_collection_scope=True) is True


def test_override_conflict_flagged(conn):
    _single(conn, sample=False)
    _acq(conn, "A1", variant="VF")
    conn.execute("INSERT INTO ownership_overrides VALUES ('u1','S1','NOT_OWNED','gave away',?)", (utcnow(),))
    o = pj.ownership_status(conn, "u1", "S1")
    assert o.status == "NOT_OWNED" and o.needs_review


def test_explicit_not_owned_vs_no_record(conn):
    _single(conn, sample=False)
    assert pj.purchase_status(conn, "u1", "S1") == "UNKNOWN"
    conn.execute("INSERT INTO ownership_overrides VALUES ('u1','S1','NOT_OWNED',NULL,?)", (utcnow(),))
    assert pj.purchase_status(conn, "u1", "S1") == "NOT_PURCHASED"


def test_one_scenario_multiple_sources(conn):
    _single(conn, sample=False)
    store.ensure_product(conn, 2)
    for sid, url, typ, item in [("SRC1", "https://booth.pm/ja/items/1", "STANDALONE", 1), ("SRC2", "https://booth.pm/ja/items/2", "BUNDLE", 2)]:
        conn.execute("INSERT INTO scenario_sources VALUES (?, 'S1', ?, ?, ?, 1)", (sid, url, item, typ))
    assert conn.execute("SELECT COUNT(*) FROM scenario_sources WHERE scenario_id='S1'").fetchone()[0] == 2
