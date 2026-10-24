from booth_scenario import db


def test_migrations_apply_once(conn):
    names = [r[0] for r in conn.execute("SELECT name FROM schema_migrations ORDER BY name")]
    assert names == ["001_initial.sql", "002_nullable_product_title.sql", "003_cover_image_url.sql"]
    assert db.migrate(conn) == []


def test_product_title_nullable_and_fks_survive_rebuild(conn):
    conn.execute("INSERT INTO products (booth_item_id, product_url, first_seen_at, last_seen_at) VALUES (1, 'u', 't', 't')")
    fks = conn.execute("PRAGMA foreign_key_list(product_variants)").fetchall()
    assert any(f["table"] == "products" for f in fks)
    import sqlite3
    import pytest
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO product_variants (variant_id, booth_item_id, variant_label) VALUES ('v', 999, 'x')")


def test_like_count_cannot_be_negative(conn):
    import sqlite3
    import pytest
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute("INSERT INTO products (booth_item_id, product_url, first_seen_at, last_seen_at, like_count) VALUES (2, 'u2', 't', 't', -1)")
