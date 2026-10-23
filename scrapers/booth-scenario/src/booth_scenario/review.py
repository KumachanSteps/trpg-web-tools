"""Review table: export what the rules extracted, take back a hand-checked copy
as ground truth, and measure the rules against it.

Layout: one row per product. For each checked field there is an `auto_*`
column (what the tool found) and an `ok_*` column. Leave `ok_*` empty when the
auto value is right; otherwise write the right value ("-" = none). Written as
.xlsx (input cells coloured, dropdowns) or .csv; import reads either.
"""
from __future__ import annotations

import csv
import json
import random
import re
from pathlib import Path

from . import targets
from .db import utcnow
from .organize import normalize_title, work_title

FIELDS = ["product_kind", "members", "systems", "session_modes", "durations", "assets", "free_full", "free_sample", "related_items"]
LIST_SEP = "; "
MEMBER_SEP = "／"
FIELD_HELP = {
    "product_kind": "SINGLE / COLLECTION / SAME_PAGE_VARIANTS / ASSET_ONLY / UNDETERMINED",
    "members": "作品名（単品は作品名1つ、アンソロジーは収録作品を／区切り）",
    "systems": "COC6 / COC7 / EMOKLORE / OTHER と NATIVE / SUPPORTED / CONVERTIBLE / CONVERSION_PATCH を : でつなぎ ; 区切り",
    "session_modes": "例: ONE_ON_ONE 1-1 KP/KPC ; MULTI_PL 2-4 KP/NONE SECRET（秘匿HOあり）",
    "durations": "例: VOICE MAIN 180-240 ; TEXT UNSPECIFIED 480-480（分）",
    "assets": "例: NPC_IMAGE:INCLUDED ; BGM_AUDIO:EXPLICITLY_ABSENT",
    "free_full": "yes / no / unknown（本編を無料で入手できるか）",
    "free_sample": "yes / no / unknown（無料サンプルがあるか）",
    "related_items": "同じ作品を売っている別商品のID ; 区切り（例: 3403696）",
}


# -- selection --------------------------------------------------------------------
_COLLECTIONISH = re.compile(r"アンソロジー|アンソロ|シナリオ集|短編集|合同|セット|詰め合わせ|収録", re.I)


def pick_review_set(conn, n: int = 50, seed: int = 20261021, exclude: set[int] | None = None) -> list[int]:
    """The 27 handoff samples first, then listing items chosen to cover kinds:
    collection-looking titles, free, multi-variant (N JPY~), then the rest.
    Items in `exclude` (e.g. already reviewed) are never picked."""
    exclude = exclude or set()
    chosen: list[int] = []
    for group in targets.SAMPLE_IDS.values():
        chosen += [i for i in group if i not in chosen and i not in exclude]
    rng = random.Random(seed)
    rows = conn.execute(
        "SELECT booth_item_id, listing_title, listing_price_jpy, listing_price_multi FROM products WHERE listing_title IS NOT NULL ORDER BY booth_item_id"
    ).fetchall()
    pool = [r for r in rows if r["booth_item_id"] not in chosen and r["booth_item_id"] not in exclude]
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
    if cls and cls["product_kind"] == "SINGLE" and not members:
        # A single product holds one work: show its name without labels.
        title = conn.execute("SELECT COALESCE(title, listing_title) FROM products WHERE booth_item_id=?", (iid,)).fetchone()[0]
        members = [work_title(title or "")]
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
            + (" SECRET" if v.get("secret_handouts") else "")
            for v in _evidence_values(conn, iid, "scenario_session_modes")),
        "durations": _uniq_sorted(
            f"{v['mode']} {v['scope']} {v['min_minutes']}-{'' if v['max_minutes'] is None else v['max_minutes']}" for v in _evidence_values(conn, iid, "scenario_durations")),
        "assets": _uniq_sorted(f"{v['asset_type']}:{v['availability_relation']}" for v in _evidence_values(conn, iid, "scenario_assets")),
        "free_full": free_full,
        "free_sample": free_sample,
        "related_items": _uniq_sorted(str(r[0]) for r in related),
    }


# -- export / import --------------------------------------------------------------------
# Header rows: a readable label row and a help row above the machine keys that
# import reads (it finds the row starting with "booth_item_id").
FIELD_LABEL = {
    "product_kind": "商品の種類 / Kind",
    "members": "収録作品 / Works included",
    "systems": "システム / System",
    "session_modes": "人数・形式 / Players",
    "durations": "プレイ時間 / Play time",
    "assets": "付属素材 / Assets",
    "free_full": "本編無料 / Free full",
    "free_sample": "無料サンプル / Free sample",
    "related_items": "関連商品 / Related items",
}
INFO_COLS = [  # key, label, help
    ("check_first", "★まず確認 / Check first", "ツールが自信のない点"),
    ("booth_item_id", "商品ID", ""),
    ("url", "URL", "クリックで商品ページ"),
    ("title", "タイトル / Title", ""),
    ("shop", "ショップ / Shop", ""),
    ("tags", "タグ / Tags", ""),
    ("variants", "バリエーション / Variants", "ラベル | 価格 | 種類 | 在庫"),
]
KIND_CHOICES = ["SINGLE", "COLLECTION", "SAME_PAGE_VARIANTS", "ASSET_ONLY", "UNDETERMINED", "-"]
YES_NO = ["yes", "no", "unknown"]


def _check_first(auto: dict) -> str:
    """What the reviewer should look at first: places where the rules are unsure."""
    notes = []
    kind = auto["product_kind"]
    if kind == "UNDETERMINED":
        notes.append("種類を判定できず")
    if kind in ("COLLECTION", "SAME_PAGE_VARIANTS"):
        notes.append("収録作品が見つからない" if not auto["members"] else "収録作品名を確認")
    if not auto["systems"] and kind not in ("ASSET_ONLY", "UNDETERMINED"):
        notes.append("システム未検出")
    if auto["free_full"] == "unknown":
        notes.append("本編無料か不明")
    return " / ".join(notes)


def _review_rows(conn, ids: list[int]) -> list[dict]:
    rows = []
    for iid in ids:
        p = conn.execute(
            """SELECT p.*, pub.shop_name FROM products p LEFT JOIN publishers pub USING(publisher_id) WHERE booth_item_id=?""", (iid,)
        ).fetchone()
        if p is None:
            continue
        variants = conn.execute("SELECT * FROM product_variants WHERE booth_item_id=? ORDER BY rowid", (iid,)).fetchall()
        auto = auto_fields(conn, iid)
        row = {
            "check_first": _check_first(auto),
            "booth_item_id": iid, "url": p["product_url"], "title": p["title"] or p["listing_title"] or "",
            "shop": p["shop_name"] or "",
            "tags": ", ".join(r[0] for r in conn.execute("SELECT tag FROM product_tags WHERE booth_item_id=?", (iid,))),
            "variants": "\n".join(f"{v['variant_label']} | {v['price_jpy'] if v['price_jpy'] is not None else '?'} | {v['edition_kind']} | {v['availability']}"
                                  for v in variants),
        }
        for f in FIELDS:
            row[f"auto_{f}"], row[f"ok_{f}"] = auto[f], ""
        row["notes"] = ""
        rows.append(row)
    return rows


def _columns() -> list[tuple[str, str, str, bool]]:
    """(key, label, help, is_input) in sheet order."""
    cols = [(k, label, h, False) for k, label, h in INFO_COLS]
    for f in FIELDS:
        cols.append((f"auto_{f}", f"{FIELD_LABEL[f]}\nツールの判定", FIELD_HELP[f], False))
        cols.append((f"ok_{f}", f"✏ {FIELD_LABEL[f]}\n正しい値", "合っていれば空欄 / 該当なしは -", True))
    cols.append(("notes", "✏ メモ / Notes", "自由記述", True))
    return cols


def export_review(conn, ids: list[int], path: Path) -> int:
    """Write the review table as .xlsx (colour-coded, dropdowns) or .csv."""
    path.parent.mkdir(parents=True, exist_ok=True)
    # Rows the rules are unsure about come first.
    rows = sorted(_review_rows(conn, ids), key=lambda r: r["check_first"] == "")
    if path.suffix.lower() == ".xlsx":
        _write_xlsx(rows, path)
        return len(rows)
    cols = _columns()
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow([c[1].replace("\n", " ") for c in cols])
        w.writerow(["#説明"] + [c[2] for c in cols[1:]])
        w.writerow([c[0] for c in cols])
        for r in rows:
            w.writerow([r[c[0]] for c in cols])
    return len(rows)


def _write_xlsx(rows: list[dict], path: Path) -> None:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.datavalidation import DataValidation

    cols = _columns()
    read_fill, input_fill = PatternFill("solid", fgColor="EEEEEE"), PatternFill("solid", fgColor="FFF2CC")
    head_read, head_input = PatternFill("solid", fgColor="D9D9D9"), PatternFill("solid", fgColor="FFD966")
    flag_fill = PatternFill("solid", fgColor="F8CBAD")
    thin = Side(style="thin", color="BFBFBF")
    wb = Workbook()
    ws = wb.active
    ws.title = "review"
    for ci, (key, label, help_text, is_input) in enumerate(cols, 1):
        for ri, val in ((1, label), (2, help_text), (3, key)):
            c = ws.cell(ri, ci, val)
            c.alignment = Alignment(wrap_text=True, vertical="top")
            c.fill = head_input if is_input else head_read
        ws.cell(1, ci).font = Font(bold=True)
        ws.cell(2, ci).font = Font(size=9, italic=True)
        ws.cell(3, ci).font = Font(size=8, color="808080")
    ws.row_dimensions[1].height = 34
    ws.row_dimensions[2].height = 48
    for ri, r in enumerate(rows, 4):
        for ci, (key, _, _, is_input) in enumerate(cols, 1):
            c = ws.cell(ri, ci, r[key])
            c.alignment = Alignment(wrap_text=True, vertical="top")
            c.border = Border(left=thin, right=thin, top=thin, bottom=thin)
            c.fill = input_fill if is_input else read_fill
            if key == "check_first" and r[key]:
                c.fill = flag_fill
            if key == "url" and r[key]:
                c.hyperlink = r[key]
                c.font = Font(color="0563C1", underline="single")
    widths = {"check_first": 22, "booth_item_id": 10, "url": 14, "title": 34, "shop": 16, "tags": 22, "variants": 40, "notes": 30,
              "auto_members": 30, "ok_members": 30, "auto_variants": 30}
    for ci, (key, *_rest) in enumerate(cols, 1):
        ws.column_dimensions[get_column_letter(ci)].width = widths.get(key, 20)
    last = len(rows) + 3
    letter = {key: get_column_letter(ci) for ci, (key, *_r) in enumerate(cols, 1)}
    for key, choices in (("ok_product_kind", KIND_CHOICES), ("ok_free_full", YES_NO + ["-"]), ("ok_free_sample", YES_NO + ["-"])):
        dv = DataValidation(type="list", formula1='"' + ",".join(choices) + '"', allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f"{letter[key]}4:{letter[key]}{last}")
    ws.freeze_panes = "E4"  # keep the check/ID/URL/title columns and headers in view
    ws.auto_filter.ref = f"A3:{get_column_letter(len(cols))}{last}"

    guide = wb.create_sheet("使い方 How to")
    for i, line in enumerate([
        "レビューの手順 / How to review",
        "1. 「review」シートを開く。灰色の列は読むだけ、黄色の列（✏）が入力欄です。",
        "2. まず左端の「★まず確認」がオレンジの行から見てください。ツールが自信のない点が書いてあります。",
        "3. 各項目は「ツールの判定」（灰色）と「正しい値」（黄色）が隣り合っています。",
        "   ・合っていれば黄色は空欄のまま。違っていれば正しい値を書く。該当なしは - と書く。",
        "   ・商品の種類・本編無料・無料サンプルはプルダウンで選べます。",
        "4. 気づいたことは右端の「メモ」へ自由に。",
        "5. 3行目（小さい灰色の英字）は取り込み用なので消さないでください。",
        "",
        "商品の種類 / Kind",
        "SINGLE = 単品シナリオ",
        "COLLECTION = アンソロジー・シナリオ集（収録作品をすべて書く。／区切り）",
        "SAME_PAGE_VARIANTS = 同じページでセットと単品を両方売っている",
        "ASSET_ONLY = 素材だけ（シナリオ本体なし）",
        "UNDETERMINED = 判定できない",
        "",
        "Grey columns are read-only; yellow (✏) columns are for your input. Leave a yellow cell empty when the tool is right,",
        "write the right value when it is wrong, and - for none. Start with the rows flagged orange in “Check first”.",
    ], 1):
        guide.cell(i, 1, line).font = Font(bold=i in (1, 10))
    guide.column_dimensions["A"].width = 110
    wb.save(path)


def _read_rows(path: Path) -> list[dict]:
    """Rows of a review table (.xlsx or .csv) keyed by the machine-key header row."""
    if path.suffix.lower() == ".xlsx":
        from openpyxl import load_workbook
        ws = load_workbook(path, read_only=True, data_only=True)["review"]
        raw = [["" if v is None else str(v) for v in r] for r in ws.iter_rows(values_only=True)]
    else:
        with path.open(encoding="utf-8-sig", newline="") as fh:
            raw = list(csv.reader(fh))
    header_at = next(i for i, r in enumerate(raw) if "booth_item_id" in r)
    header = raw[header_at]
    return [dict(zip(header, r)) for r in raw[header_at + 1:]]


def import_review(conn, path: Path) -> dict:
    """Store the checked table as review_labels; a corrected kind or member list
    becomes a MANUAL classification that organize will follow."""
    imported, corrected, warnings = 0, 0, []
    for row in _read_rows(path):
        iid_s = (row.get("booth_item_id") or "").strip()
        if iid_s.endswith(".0"):  # a spreadsheet may turn IDs into floats
            iid_s = iid_s[:-2]
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
        if labels["product_kind"]["truth"].strip().upper() not in KIND_CHOICES:
            # Not a kind (e.g. a pasted variant line): keep the tool's answer.
            warnings.append(f"{iid}: product_kind {labels['product_kind']['truth']!r} is not a kind; kept {labels['product_kind']['auto']}")
            labels["product_kind"] = {"auto": labels["product_kind"]["auto"], "truth": labels["product_kind"]["auto"], "corrected": False}
            conn.execute("UPDATE review_labels SET labels_json=? WHERE booth_item_id=?", (json.dumps(labels, ensure_ascii=False), iid))
            corrected -= 1
        if labels["product_kind"]["corrected"] or labels["members"]["corrected"]:
            members = [t.strip() for t in re.split(r"[／/\n]|[;；](?=\s|$)", labels["members"]["truth"]) if t.strip()]
            conn.execute(
                """INSERT OR REPLACE INTO product_classifications
                   (booth_item_id, product_kind, member_count, member_titles_json, method, reasons_json, classified_at)
                   VALUES (?, ?, ?, ?, 'MANUAL', ?, ?)""",
                (iid, labels["product_kind"]["truth"].strip().upper(), len(members) or None,
                 json.dumps(members, ensure_ascii=False), json.dumps(["from review table"]), utcnow()),
            )
        imported += 1
    conn.commit()
    out = {"imported": imported, "corrected_cells": corrected}
    if warnings:
        out["warnings"] = warnings
    return out


_MODE_ALIAS = {"GMLESS_PL": "GMLESS_MULTI", "ONE_PLAYER_SOLO": "SOLO", "ONE_PLAYER_UNSPECIFIED": "SOLO"}
_SESSION_RE = re.compile(r"([A-Z_]{3,})\s+(\d+)\s*-\s*(\d+)(?:\s+([A-Z]+)\s*/\s*([A-Z]+))?")
_DURATION_RE = re.compile(
    r"(VOICE|TEXT|SEMI_TEXT|UNSPECIFIED)\s+(?:(MAIN|INTRO|ALL_EPISODES|EPISODE|OTHER|UNSPECIFIED|ACT\s*\d+|EP\s*\d+|TOTAL)\s+)?(\d*)\s*-\s*(\d+|UNSPECIFIED)?")
_SCOPE_ALIAS = {"TOTAL": "ALL_EPISODES"}


def _segments(value: str) -> list[str]:
    # Reviewers may prefix a segment with the source phrase: "新規4人固定 -> MULTI_PL 4-4".
    return [p.split("->")[-1].strip() for p in re.split(r"\s*;\s*|\n", value or "") if p.strip()]


def _norm_value(field: str, value: str) -> frozenset:
    """Comparable form of a cell. Lenient with hand-written values: free text
    around the codes is ignored, a missing scope means UNSPECIFIED, and a time
    without text/voice is a voice session."""
    value = (value or "").strip()
    if value in ("", "-"):
        return frozenset()
    if field == "members":
        # ";" only as a list mark ("A;\nB"), not inside a title like "Sm;ley".
        return frozenset(normalize_title(t) for t in re.split(r"[／/\n]|[;；](?=\s|$)", value) if t.strip())
    if field == "session_modes":
        out = set()
        for seg in _segments(value):
            for m in _SESSION_RE.finditer(seg.upper()):
                mode = _MODE_ALIAS.get(m.group(1), m.group(1))
                roles = f" {m.group(4)}/{m.group(5)}" if m.group(4) else ""
                secret = " SECRET" if re.search(r"SECRET|秘匿", seg, re.I) else ""
                out.add(f"{mode} {m.group(2)}-{m.group(3)}{roles}{secret}")
        return frozenset(out)
    if field == "durations":
        out = set()
        for seg in _segments(value):
            for m in _DURATION_RE.finditer(seg.upper()):
                mode = "VOICE" if m.group(1) == "UNSPECIFIED" else m.group(1)
                hi = "" if m.group(4) in (None, "UNSPECIFIED") else m.group(4)
                scope = m.group(2) or "UNSPECIFIED"
                scope = "EPISODE" if re.match(r"(ACT|EP)\s*\d", scope) else _SCOPE_ALIAS.get(scope, scope)
                out.add(f"{mode} {scope} {m.group(3)}-{hi}")
        return frozenset(out)
    parts = re.split(r"\s*;\s*|\n", value)
    return frozenset(re.sub(r"\s+", " ", p.strip()).upper() for p in parts if p.strip())


def _matches(field: str, tool: str, truth: str) -> bool:
    a, b = _norm_value(field, tool), _norm_value(field, truth)
    if field == "members" and not b and len(a) == 1:
        return True  # the first round left a single work's name blank
    if field != "session_modes":
        return a == b
    # A truth entry without roles ("ONE_ON_ONE 1-1"), or with UNKNOWN ones left
    # from an older export, matches the tool's entry with any roles there.
    def same(tool_e: str, truth_e: str) -> bool:
        # SECRET (秘匿HO) was added after the first review round; compare it only
        # when the reviewer wrote it.
        if truth_e.endswith(" SECRET") and not tool_e.endswith(" SECRET"):
            return False
        t, r = tool_e.removesuffix(" SECRET").split(), truth_e.removesuffix(" SECRET").split()
        if t[:2] != r[:2]:
            return False
        if len(r) < 3:
            return True
        tr = t[2].split("/") if len(t) > 2 else ["", ""]
        return all(x in ("UNKNOWN", y) for x, y in zip(r[2].split("/"), tr))
    return all(any(same(x, y) for x in a) for y in b) and all(any(same(x, y) for y in b) for x in a)


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
        members = rule.members or ([work_title(data["product"]["title"] or "")] if rule.kind == "SINGLE" else [])
        now["product_kind"], now["members"] = rule.kind, MEMBER_SEP.join(members)
        for f in FIELDS:
            if f not in labels:
                continue
            st = per_field[f]
            st["checked"] += 1
            if _matches(f, now[f], labels[f]["truth"]):
                st["correct"] += 1
            else:
                st["misses"].append({"booth_item_id": iid, "tool": now[f], "truth": labels[f]["truth"]})
    for st in per_field.values():
        st["accuracy"] = round(st["correct"] / st["checked"], 3) if st["checked"] else None
    return per_field


def reviewed_ids(conn) -> set[int]:
    return {r[0] for r in conn.execute("SELECT booth_item_id FROM review_labels")}


def save_set(ids: list[int], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(ids), encoding="utf-8")


def load_set(path: Path) -> list[int]:
    return json.loads(path.read_text(encoding="utf-8"))
