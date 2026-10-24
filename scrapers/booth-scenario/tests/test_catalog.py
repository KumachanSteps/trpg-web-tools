import json

from booth_scenario import store
from booth_scenario.catalog import export_catalog
from booth_scenario.parsers.detail import parse_detail_html


def _setup(conn, synthetic):
    store.load_synthetic_fixture(conn, synthetic)
    conn.execute("UPDATE scenarios SET canonical_title='霧笛の灯台', system_primary='COC6' WHERE scenario_id='SCN-TEST-A'")
    conn.execute("INSERT INTO scenario_session_modes (session_mode_id, scenario_id, mode, player_min, player_max) VALUES ('m1','SCN-TEST-A','ONE_ON_ONE',1,1)")
    conn.execute("INSERT INTO scenario_durations (duration_id, scenario_id, mode, scope, min_minutes, max_minutes, approximate) VALUES ('d1','SCN-TEST-A','VOICE','MAIN',180,240,1)")
    conn.execute("INSERT INTO scenario_conditions (condition_id, scenario_id, category, condition_text) VALUES ('c1','SCN-TEST-A','HO','秘匿HOあり')")
    conn.commit()


def test_export_writes_manifest_and_shards(conn, synthetic, tmp_path):
    _setup(conn, synthetic)
    manifest = export_catalog(conn, tmp_path, generated_at="2026-10-24T00:00:00Z")
    assert manifest["schema"] == "catalog/v1" and manifest["license"] == "CC BY 4.0"
    assert manifest["counts"]["scenarios"] == 2
    assert json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8")) == manifest
    data = json.loads((tmp_path / manifest["shards"][0]["path"]).read_text(encoding="utf-8"))
    a = {s["id"]: s for s in data["scenarios"]}["SCN-TEST-A"]
    assert a["title"] == "霧笛の灯台" and a["system"] == "COC6"
    assert a["players"] == {"min": 1, "max": 1}
    assert a["duration"] == {"min": 180, "max": 240, "approximate": True}
    assert a["secret_ho"] is True
    # sample variant (price 0) is not a full free edition
    assert a["price"] == {"min": 200, "max": 300}
    assert a["source"]["site"] == "BOOTH" and a["source"]["item_id"] == 99999999
    assert "Example Anthology" in a["aliases"]


def test_unknown_stays_null(conn, synthetic, tmp_path):
    _setup(conn, synthetic)
    manifest = export_catalog(conn, tmp_path)
    b = {s["id"]: s for s in json.loads((tmp_path / manifest["shards"][0]["path"]).read_text(encoding="utf-8"))["scenarios"]}["SCN-TEST-B"]
    assert b["secret_ho"] is None and b["players"] == {"min": None, "max": None}
    assert b["system"] == "UNKNOWN" and b["duration"]["min"] is None


def test_version_changes_with_content_and_old_shards_removed(conn, synthetic, tmp_path):
    _setup(conn, synthetic)
    v1 = export_catalog(conn, tmp_path, shard_size=1)["version"]
    assert sorted(p.name for p in tmp_path.glob("scenarios-*.json")) == ["scenarios-000.json", "scenarios-001.json"]
    conn.execute("UPDATE scenarios SET canonical_title='霧笛の灯台 改' WHERE scenario_id='SCN-TEST-A'")
    v2 = export_catalog(conn, tmp_path)["version"]
    assert v1 != v2
    assert [p.name for p in tmp_path.glob("scenarios-*.json")] == ["scenarios-000.json"]


def test_og_image_becomes_cover_url(conn):
    html = '<html><head><meta property="og:title" content="T - S - BOOTH"><meta property="og:image" content="https://booth.pximg.net/c/620x620/x.jpg"></head><body></body></html>'
    rec = parse_detail_html(html, 7, "https://booth.pm/ja/items/7", selectors={})
    assert rec.cover_image_url == "https://booth.pximg.net/c/620x620/x.jpg"
    store.save_detail(conn, rec, "2026-10-24T00:00:00+00:00", html)
    assert conn.execute("SELECT cover_image_url FROM products WHERE booth_item_id=7").fetchone()[0] == rec.cover_image_url
