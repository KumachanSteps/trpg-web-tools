"""SQLite connection and numbered-file migrations."""
from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from importlib import resources
from pathlib import Path


def utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def new_id(prefix: str) -> str:
    """Opaque local ID. Never derived from titles or BOOTH item IDs."""
    return f"{prefix}-{uuid.uuid4().hex[:16]}"


def _migration_files() -> list[tuple[str, str]]:
    pkg = resources.files("booth_scenario") / "migrations"
    files = sorted(p for p in pkg.iterdir() if p.name.endswith(".sql"))
    return [(p.name, p.read_text(encoding="utf-8")) for p in files]


def connect(path: str | Path = ":memory:") -> sqlite3.Connection:
    if str(path) != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    migrate(conn)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def migrate(conn: sqlite3.Connection) -> list[str]:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
    )
    done = {r[0] for r in conn.execute("SELECT name FROM schema_migrations")}
    applied = []
    for name, sql in _migration_files():
        if name in done:
            continue
        # Table rebuilds need FK enforcement off; executescript commits first.
        conn.execute("PRAGMA foreign_keys = OFF")
        conn.executescript("BEGIN;\n" + sql.replace("PRAGMA foreign_keys = ON;", "") + "\nCOMMIT;")
        conn.execute("INSERT INTO schema_migrations VALUES (?, ?)", (name, utcnow()))
        conn.commit()
        applied.append(name)
    conn.execute("PRAGMA foreign_keys = ON")
    bad = conn.execute("PRAGMA foreign_key_check").fetchall()
    if bad:
        raise RuntimeError(f"foreign key check failed after migration: {bad[:5]}")
    return applied
