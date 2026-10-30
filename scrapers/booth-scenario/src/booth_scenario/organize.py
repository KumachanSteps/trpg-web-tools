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

from . import targets
from .db import new_id, utcnow
from .store import ensure_product
from .rules import classify_edition_kind, lines, normalize as _normalize_text

_COLLECTION_TITLE = re.compile(r"アンソロジー|アンソロ|シナリオ集|短編集|合同誌|合同本|詰め合わせ|オムニバス|アソート|anthology", re.I)
_SINGLE_TITLE = re.compile(r"単体版|単品版|単品")
_SECTION_HEAD = re.compile(r"収録(作品|シナリオ|作|タイトル|一覧|内容)|執筆者.{0,8}シナリオ|シナリオ一覧|目次", re.I)
_MEMBER_COUNT = re.compile(r"(?:全\s*)?(\d+)\s*(?:本|作品|作|編|シナリオ)(?:を)?\s*(?:収録|入り|セット)|収録数\s*[::]?\s*(\d+)|シナリオ\s*全\s*(\d+)\s*本")
# "通常セット" or "スチルセット" are not bundles of several works.
_BUNDLE_LABEL = re.compile(r"全.{0,8}セット|シリーズ.{0,4}セット|アソート|まとめ|全部|コンプリート|一式|全\s*\d*\s*話|全作|全\s*\d+\s*本|\d+\s*本セット|バンドル|合本|詰め合わせ|全シナリオ|bundle", re.I)
_ROLE_PACKET = re.compile(r"^\s*(HO\s*\d|(GM|KP|DL|PL)\s*用)", re.I)
_FORMAT_LABEL = re.compile(
    r"PDF|テキスト|txt|word|版|部屋|ルーム|素材|付き|付|通常|フル|DL|ダウンロード|紙|書籍|冊子|物理|匿名配送|おまけ|支援|投げ銭|ブースト|データ|"
    r"本編|画像|のみ|pack|edition|ver|中文|English|英語|韓国語|한국어|日本語|配信|KPレス|タイマン|HO\s*\d|PL", re.I)
_QUOTED = re.compile(r"[『「]([^』」]{1,60})[』」]")
_BULLET = re.compile(r"^(?:[・●○◆◇■□▼▽▍★☆♦◎※\-*]|\d+[.)．、]|[①-⑳]|第\s*\d+\s*話|No\.?\s*\d+)\s*")
_SCENARIO_SIGNAL = re.compile(r"シナリオ|scenario|クトゥルフ|CoC|エモクロア|TRPG|探索者|KP|PL|マーダーミステリー|マダミス|murder\s*mystery", re.I)
_ASSET_SIGNAL = re.compile(r"素材|立ち絵|スチル|BGM|背景|アイコン|ルームデータ|部屋データ|ココフォリア|ユドナリウム|トレーラー|ハンドアウト素材|キャラシ|ダイス|グッズ|テンプレート|サプリメント", re.I)
# Lines that are file lists, credits or play conditions, never a work's title.
_NOT_TITLE = re.compile(
    r"\.(pdf|txt|zip|png|jpe?g|docx?)\b|PDF|txt|テキスト|データ|画像|素材|立ち絵|スチル|トレーラー|BGM|URL|ページ|\d+\s*P\b|字[)）]|ルーム|"
    r"チャットパレット|tips|権利|株式会社|©|ⓒ|KADOKAWA|アークライト|Chaosium|ことがある|すること|推奨|必須|可能|不可|禁止|限定|以上|以下|"
    r"人数|時間|ロスト|技能|HO\s*\d|ハンドアウト|注意|概要|あらすじ|システム|価格|形式|クレジット|更新|購入|規約|問い合わせ|ネタバレ|[:：]|"
    r"修正|追記|^v(?:er)?\s*\d|\d+/\d+|"
    r"本編|本文|おまけ|特典|協力|制作|デザイン|イラスト|編集|表紙|校正|ディレクター|発行|頒布|[【】()（）]|。$|^[A-Za-z]{1,4}$|^\d+$", re.I)
# A 「quote」 followed by these is part of a sentence, not a title line.
_SENTENCE_TAIL = re.compile(r"^(から|は|を|が|に|で|と|の|や|も|へ|より|まで|以外|以降|以前|として|など|ため|こと|です|ます|。|、)")
_SYSTEM_WORDS = re.compile(r"^(新?クトゥルフ神話TRPG|エモクロアTRPG|CoC\s*\d?|TRPG)$", re.I)
_ITEM_URL = re.compile(r"https?://(?:[a-z0-9-]+\.)?booth\.pm/(?:[a-z]{2}/)?items/(\d+)")

# Tags that name a system (BOOTH tag text as seen on product pages).
_TAG_SYSTEMS = {"新クトゥルフ神話TRPG": "COC7", "エモクロアTRPG": "EMOKLORE", "エモクロア": "EMOKLORE",
                "マーダーミステリー": "MADAMIS", "マダミス": "MADAMIS"}


def normalize_title(title: str) -> str:
    """Comparison key only: NFKC, lower case, drop brackets/labels/spaces."""
    t = unicodedata.normalize("NFKC", title).lower()
    t = re.sub(r"[【\[(（<〈《].*?[】\])）>〉》]", "", t)
    t = re.sub(r"(coc|クトゥルフ神話trpg|新クトゥルフ|エモクロア|trpg|シナリオ|scenario|6版|7版|対応|pdf)", "", t)
    return re.sub(r"[\s・\-_~!?！？。、,.『』「」/／]+", "", t)


# -- work title of a single product ---------------------------------------------
_TITLE_LABEL = re.compile(r"CoC|C[оo]C|クトゥルフ|TRPG|シナリオ|版|秘匿|HO|SPLL|PDF|無料|有料|KPレス|DLレス|タイマン|ソロ|回復|SAN|DL|中文|同梱|キャンペーン|CP|エモクロア|新作|再販|改訂|R18|R-18|R15|配布|頒布|ver|対応|限定|BOOTH|シナリオブック|サンプル|PL|人用|\d+人|6th|7th", re.I)
_TITLE_QUOTE = re.compile(r"[「『]([^」』]{1,80})[」』]")
_TITLE_SYSTEM = re.compile(r"(新?クトゥルフ神話\s*TRPG|エモクロア\s*TRPG|C[оo]C\s*TRPG|C[оo]C|TRPG)\s*(シナリオ(ブック|集)?|ソロシナリオ|タイマンシナリオ|キャンペーンシナリオ)?\s*(\d版)?", re.I)

def work_title(title: str) -> str:
    """The work's own name inside a BOOTH product title:
    "【CoCシナリオ】花に嵐【SPLL:E1】" -> "花に嵐", "CoC「塔葬の国」" -> "塔葬の国"."""
    t = unicodedata.normalize("NFKC", title or "").strip()
    t = re.sub(r"SPLL\s*[:：]?\s*E?\d+", "", t)
    for q in _TITLE_QUOTE.findall(t):
        if not _TITLE_SYSTEM.fullmatch(q.strip()) and not _TITLE_LABEL.fullmatch(q.strip()):
            return q.strip()
    brackets = re.findall(r"[【\[]([^】\]]*)[】\]]", t)
    rest = re.sub(r"[【\[][^】\]]*[】\]]", " ", t)
    # Labels in round or angle brackets: "(CoC6版)", "《CoC6版》", "(データ版)".
    rest = re.sub(r"[(（《〈<]([^)）》〉>]*)[)）》〉>]", lambda m: " " if _TITLE_LABEL.search(m.group(1)) else m.group(0), rest)
    rest = re.sub(r"^[\s▼▽■□◆◇●○★☆▶]+", "", rest)
    # "稲妻のように燃えて寄せ｜COC6&7th": a system label after a bar.
    rest = re.sub(r"\s*\|[^|]*(C[оo]C|クトゥルフ|エモクロア|TRPG|\d\s*(th|版))[^|]*$", "", rest, flags=re.I)
    # Edition words at the end: "月の御殿 オンライン版", "(印刷用データ)".
    rest = re.sub(r"\s*[(（]?\s*(オンライン|オフライン|印刷用|PDF|データ|テキスト)(版|データ)?\s*[)）]?\s*$", "", rest)
    rest = _TITLE_SYSTEM.sub(" ", rest)
    rest = re.sub(r"[(（《〈<]\s*[)）》〉>]", " ", rest)
    rest = re.sub(r"\s*[+＋].*(設定資料|リプレイ|素材|特典|おまけ|資料).*$", "", rest)
    rest = re.sub(r"^\s*(無料|有料|新作|再販)\s*", "", rest)
    rest = re.sub(r"\s+", " ", rest).strip(" /／-~・|")
    if rest:
        return rest
    named = [b for b in brackets if b.strip() and not _TITLE_LABEL.search(b)]
    return (named[0] if named else t).strip()


@dataclass
class Classification:
    kind: str
    members: list[str] = field(default_factory=list)
    member_count: int | None = None
    bundle_labels: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)
    method: str = "RULE"
    member_items: dict[str, int] = field(default_factory=dict)  # member title -> BOOTH item linked next to it


def _title_from_line(line: str, in_section: bool) -> str | None:
    s = re.sub(r"https?://\S+", "", _BULLET.sub("", line.strip())).strip()
    if not s:
        return None
    # 「Title」 or 「Title」author / 「Title」/author
    m = re.fullmatch(r"[「『]([^」』]{1,50})[」』]\s*([/／]?)\s*([^「『」』/／]{0,20})", s)
    if m:
        tail = m.group(3).strip()
        if not m.group(2) and _SENTENCE_TAIL.match(tail):
            return None
        if not in_section and not tail:
            return None  # a bare quote outside a 収録作品 section is usually a phrase
        t = m.group(1)
    elif m := re.fullmatch(r"([^（(]{1,50}?)\s*[（(]\s*(?:作|著|執筆|作者)\s*[:：]\s*[^)）]{1,20}[)）]", s):
        t = m.group(1)
    elif in_section and (m := re.fullmatch(r"([^／/]{1,50}?)\s*[／/]\s*([^／/]{1,20})", s)):
        if _NOT_TITLE.search(m.group(2)):
            return None  # "R2.7/21 誤字修正" is an update log, not Title／Author
        t = m.group(1)  # Title／Author, only inside a 収録作品 section
    else:
        return None
    t = t.strip(" 　「」『』")
    if not t or _SYSTEM_WORDS.match(t) or _NOT_TITLE.search(t) or _SECTION_HEAD.search(t) or re.fullmatch(r"[A-Za-z]?\d+(?:\.\d+)+", t):
        return None
    return t


def extract_members(text: str, whole_text: bool = False) -> tuple[list[str], dict[str, int]]:
    """Work titles under a 収録作品-style heading (lines like 「T」author,
    T（作：A）, ■T／A). With whole_text, also standalone 「T」author lines
    anywhere (used only when the title already says it is a collection).
    A booth.pm item URL on the next lines is kept as that work's own page."""
    ls = lines(text or "")
    titles: list[str] = []
    items: dict[str, int] = {}

    def add(t: str, i: int) -> None:
        k = normalize_title(t)
        if not k or any(normalize_title(x) == k for x in titles):
            return
        titles.append(t)
        # The work's own page: a URL on the same line, or a line holding only a URL.
        if m := _ITEM_URL.search(ls[i]):
            items[t] = int(m.group(1))
        elif i + 1 < len(ls) and (m := _ITEM_URL.search(ls[i + 1])) and re.fullmatch(r"(?:[→⇒▶・●■]|URL\s*[:：]?)?\s*https?://\S+", ls[i + 1].strip()):
            items[t] = int(m.group(1))

    for i, ln in enumerate(ls):
        if _SECTION_HEAD.search(ln) and (len(ln) <= 30 or _BULLET.match(ln) or ln[:1] in "【[〔"):
            for q in _QUOTED.findall(ln):
                if not _SYSTEM_WORDS.match(q) and not _NOT_TITLE.search(q) and not _SECTION_HEAD.search(q):
                    add(q, i)
            for j in range(i + 1, min(i + 80, len(ls))):
                if t := _title_from_line(ls[j], in_section=True):
                    add(t, j)
            if len(titles) >= 2:
                return titles, items
            titles, items = [], {}
    if whole_text:
        for i, ln in enumerate(ls):
            if t := _title_from_line(ln, in_section=False):
                add(t, i)
        if len(titles) >= 2:
            return titles, items
    return [], {}


def extract_member_titles(text: str, whole_text: bool = False) -> list[str]:
    return extract_members(text, whole_text)[0]


_QUOTE_LINE = re.compile(r"([▼▽■□◆◇●○・★☆▶]?)\s*(?:[^「『」』]{0,24}?)([「『])([^」』]{1,50})[」』]")


def _members_by_count(text: str, n: int | None) -> list[str]:
    """With a stated count ("4本収録"), the works are often bare quoted lines
    (『Re:おキツネさま』 / ▼「残夏に啼く」). Lines are grouped by their bullet
    and bracket; a group of exactly n is taken."""
    if not n:
        return []
    groups: dict[tuple, list[str]] = {}
    for ln in lines(text or ""):
        m = _QUOTE_LINE.fullmatch(ln)
        if not m:
            continue
        t = m.group(3).strip()
        if re.search(r"[:：]\s*$|テーマ|傾向|キーワード", ln[:m.start(2)]):
            continue  # a labelled value ("テーマ：『ペット』"), not a title
        # Lighter filter than _NOT_TITLE: a title may hold a colon ("Re:おキツネさま").
        if _SYSTEM_WORDS.match(t) or _SECTION_HEAD.search(t) or re.search(r"。$|\.(pdf|txt|zip)|^\d|修正|追記|ver\s*\d", t, re.I):
            continue
        g = groups.setdefault((m.group(1), m.group(2)), [])
        if normalize_title(t) not in {normalize_title(x) for x in g}:
            g.append(t)
    hits = [(k, g) for k, g in groups.items() if len(g) == n]
    if len(hits) > 1:  # titles get a bullet more often than taglines do
        hits = [(k, g) for k, g in hits if k[0]]
    return hits[0][1] if len(hits) == 1 else []


def _members_from_title(title: str, text: str) -> list[str]:
    """"＃落園 / プリズム": two names in the title, each quoted in the text."""
    parts = [p.strip(" #＃") for p in re.split(r"\s+[/／]\s+", work_title(title))]
    if len(parts) < 2:
        return []
    quoted = {normalize_title(q) for q in _QUOTED.findall(text or "")}
    return parts if all(normalize_title(p) in quoted for p in parts) else []


def _member_count_hint(text: str, own_only: bool = False) -> int | None:
    """Stated number of works. With own_only, skip a count that follows a link
    to another BOOTH item (it describes that item: "続編シナリオ3本を収録")."""
    t = _normalize_text(text or "")
    m = _MEMBER_COUNT.search(t)
    if not m or (own_only and _ITEM_URL.search(t[max(0, m.start() - 200):m.start()])):
        return None
    n = int(m.group(1) or m.group(2) or m.group(3))
    return n if 2 <= n <= 100 else None


def effective_kind(v: dict, title: str, n_variants: int) -> str:
    """Edition kind with product context: a variant labelled with the product's
    own title (or the only variant) of a scenario product is the scenario."""
    k = v.get("edition_kind") or classify_edition_kind(v["variant_label"])
    if k != "UNKNOWN":
        return k
    label, t = normalize_title(v["variant_label"]), normalize_title(title)
    if n_variants == 1 or (label and t and (label in t or t in label)):
        return "FULL"
    return k


def classify(title: str, description: str, variants: list[dict], tags: list[str], category: str | None = None) -> Classification:
    reasons: list[str] = []
    real = [v for v in variants if v.get("external_variant_id") is not None or v.get("availability") != "UNAVAILABLE"] or variants
    kinds = {id(v): effective_kind(v, title, len(real)) for v in real}
    full = [v for v in real if kinds[id(v)] in ("FULL", "FREE_PLAYABLE_EDITION")]
    unknown = [v for v in real if kinds[id(v)] == "UNKNOWN"]

    scenario_signal = (bool(_SCENARIO_SIGNAL.search(title)) or any(_SCENARIO_SIGNAL.search(t) for t in tags)
                       or bool(re.search(r"シナリオ|マーダーミステリー|マダミス", description or "")) or bool(_SCENARIO_SIGNAL.search(category or "")))
    if not scenario_signal:
        if _ASSET_SIGNAL.search(title):
            return Classification("ASSET_ONLY", reasons=["no scenario signal; asset words in title"])
        return Classification("UNDETERMINED", reasons=["no scenario signal"])
    # Only a plain statement about the product itself ("これは、シナリオではない",
    # "…はシナリオではなく補助ツール"), not a remark on the story's tone.
    if re.search(r"これは[、,]?\s*シナリオでは(ない|ありません)|シナリオではなく[^。\n]{0,30}(ツール|素材)", description or ""):
        return Classification("ASSET_ONLY", reasons=["description says it is not a scenario (a tool or material)"])
    if (m := _ASSET_SIGNAL.search(title)) and "シナリオ" not in title and not re.match(r"\s*(付き|付|同梱|あり|入り)", title[m.end():]):
        return Classification("ASSET_ONLY", reasons=["asset words in title, no scenario word"])

    # Same page sells a bundle and the works one by one.
    bundles = [v for v in full + unknown if _BUNDLE_LABEL.search(v["variant_label"])]
    singles = [v for v in full + unknown if v not in bundles and not _ROLE_PACKET.search(v["variant_label"])
               and (re.search(r"単品", v["variant_label"]) or _QUOTED.search(v["variant_label"]) or not _FORMAT_LABEL.search(v["variant_label"]))
               and normalize_title(v["variant_label"]) != normalize_title(title)]
    if bundles and not singles and any(_ROLE_PACKET.search(v["variant_label"]) for v in full + unknown):
        # A murder mystery sold as a set and per role ("HO1…", "GM用"): one work.
        return Classification("SAME_PAGE_VARIANTS", members=[work_title(title)], member_count=1,
                              bundle_labels=[b["variant_label"] for b in bundles], reasons=["role packets next to a set"])
    if bundles and singles:
        members = []
        for v in singles:
            m = _QUOTED.search(v["variant_label"])
            members.append(m.group(1) if m else re.sub(r"^\s*[\[【(（]?単品[\]】)）]?\s*", "", v["variant_label"]).strip())
        reasons.append(f"bundle variant(s) {[b['variant_label'] for b in bundles]} next to single variants")
        listed, items = extract_members(description, whole_text=True)
        keys = {normalize_title(x) for x in listed}
        if len(listed) > len(members) and all(normalize_title(m) in keys for m in members):
            reasons.append(f"description lists {len(listed)} works; {len(listed) - len(members)} not sold separately here")
            members = listed
        else:
            items = {}
        return Classification("SAME_PAGE_VARIANTS", members=members, member_count=len(members),
                              bundle_labels=[b["variant_label"] for b in bundles], reasons=reasons, member_items=items)

    if _SINGLE_TITLE.search(title):
        return Classification("SINGLE", reasons=["title says single edition (単体版/単品)"])
    title_says = bool(_COLLECTION_TITLE.search(title))
    members, items = extract_members(description, whole_text=title_says)
    # "シナリオ3本を収録" is a collection even when the title does not say so.
    count_hint = _member_count_hint(description, own_only=not (title_says or members))
    if not members:
        members = _members_by_count(description, count_hint) or _members_from_title(title, description)
        if members:
            reasons.append("member titles from quoted lines")
    if title_says or len(members) >= 2 or count_hint:
        if title_says:
            reasons.append("collection word in title")
        if members:
            reasons.append(f"{len(members)} member titles listed in description")
        if count_hint:
            reasons.append(f"description states {count_hint} works")
        if not members:
            reasons.append("members not found: needs review")
        return Classification("COLLECTION", members=members, member_count=len(members) or count_hint, reasons=reasons, member_items=items)

    reasons.append("scenario signal, no collection signal")
    if len(full) >= 2:
        reasons.append(f"{len(full)} full variants read as formats/editions of one work")
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
                """INSERT INTO scenario_session_modes (session_mode_id, scenario_id, mode, player_min, player_max, player_fixed,
                   facilitator_role, companion_role, evidence_id, secret_handouts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (new_id("SM"), sid, v["mode"], v.get("player_min"), v.get("player_max"), v.get("player_fixed"),
                 v.get("facilitator_role"), v.get("companion_role"), eid, v.get("secret_handouts", 0)),
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
    if len(from_tags) == 1:
        return from_tags.pop()
    # Last resort: the tag of the listing query the product was found under.
    found_under = {targets.QUERY_TAG_SYSTEMS.get(r[0]) for r in conn.execute(
        """SELECT DISTINCT q.tag FROM product_scenarios ps JOIN search_hits h USING(booth_item_id)
           JOIN crawl_pages cp USING(crawl_page_id) JOIN search_queries q USING(search_query_id)
           WHERE ps.scenario_id=?""", (sid,))} - {None}
    return found_under.pop() if len(found_under) == 1 else "UNKNOWN"


def _variant_coverage(v: dict) -> str | None:
    kind = v.get("edition_kind") or "UNKNOWN"
    return {"FULL": "COMPLETE", "FREE_PLAYABLE_EDITION": "COMPLETE", "SAMPLE": "SAMPLE", "ASSET_ONLY": "ASSET_ONLY"}.get(kind)


def stored_classification(conn, iid: int) -> Classification | None:
    r = conn.execute("SELECT * FROM product_classifications WHERE booth_item_id=?", (iid,)).fetchone()
    if not r:
        return None
    return Classification(r["product_kind"], json.loads(r["member_titles_json"] or "[]"), r["member_count"],
                          reasons=json.loads(r["reasons_json"] or "[]"), method=r["method"],
                          member_items={k: int(v) for k, v in json.loads(r["member_items_json"] or "{}").items()})


def _drop_stale_variants(conn, iid: int, variants: list[dict]) -> list[dict]:
    """ID-less, unavailable rows next to ID'd ones are leftovers of HTML parsing
    (JSON-LD "(offer)", "ダウンロード商品"), not real variants."""
    if not any(v["external_variant_id"] for v in variants):
        return variants
    keep = []
    for v in variants:
        stale = v["external_variant_id"] is None and v["availability"] == "UNAVAILABLE"
        used = conn.execute("SELECT 1 FROM acquisition_records WHERE variant_id=?", (v["variant_id"],)).fetchone()
        if stale and not used:
            conn.execute("DELETE FROM variant_scenarios WHERE variant_id=?", (v["variant_id"],))
            conn.execute("DELETE FROM product_variants WHERE variant_id=?", (v["variant_id"],))
        else:
            keep.append(v)
    return keep


def _settle_edition_kinds(conn, cls: Classification, title: str, variants: list[dict]) -> None:
    """Store kinds that need product context (title-labelled variant = the
    scenario; on a same-page product, a variant named after a work = that work)."""
    members = [normalize_title(m) for m in cls.members if normalize_title(m)]
    for v in variants:
        if v["edition_kind"] != "UNKNOWN":
            continue
        k = effective_kind(v, title, len(variants))
        if k == "UNKNOWN" and cls.kind == "SAME_PAGE_VARIANTS" and any(m in normalize_title(v["variant_label"]) for m in members):
            k = "FULL"
        if k != "UNKNOWN":
            conn.execute("UPDATE product_variants SET edition_kind=? WHERE variant_id=?", (k, v["variant_id"]))
            v["edition_kind"] = k


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
            """INSERT OR REPLACE INTO product_classifications
               (booth_item_id, product_kind, member_count, member_titles_json, member_items_json, method, reasons_json, classified_at)
               VALUES (?, ?, ?, ?, ?, 'RULE', ?, ?)""",
            (iid, cls.kind, cls.member_count, json.dumps(cls.members, ensure_ascii=False),
             json.dumps(cls.member_items, ensure_ascii=False), json.dumps(cls.reasons, ensure_ascii=False), now),
        )
    _clear_item(conn, iid)
    title = p["title"] or p["listing_title"] or f"item {iid}"
    url = p["product_url"]
    variants = _drop_stale_variants(conn, iid, variants)
    if cls.kind in ("SINGLE", "COLLECTION", "SAME_PAGE_VARIANTS"):
        _settle_edition_kinds(conn, cls, title, variants)
    # A work's own page linked in an anthology's description: queue it for crawling.
    for linked in cls.member_items.values():
        if linked != iid:
            ensure_product(conn, linked, now)

    if cls.kind == "SINGLE":
        sid = _scenario_for_key(conn, f"item:{iid}:single", work_title(title), now)
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
    # 1) An anthology names a work's own BOOTH page next to its title.
    for c in conn.execute("SELECT booth_item_id, member_items_json FROM product_classifications WHERE member_items_json IS NOT NULL AND member_items_json != '{}'").fetchall():
        for mt, linked in json.loads(c["member_items_json"]).items():
            m = conn.execute("SELECT scenario_id FROM scenario_keys WHERE derivation_key=?", (f"item:{c['booth_item_id']}:member:{normalize_title(mt) or mt}",)).fetchone()
            s = conn.execute("SELECT scenario_id FROM scenario_keys WHERE derivation_key=?", (f"item:{linked}:single",)).fetchone()
            if m and s and m[0] != s[0]:
                reasons = {"member_item": c["booth_item_id"], "single_item": linked, "url_in_description": True}
                cur = conn.execute(
                    "INSERT OR IGNORE INTO scenario_link_candidates VALUES (?, ?, ?, 'SAME_WORK', 0.95, ?, 'PENDING', ?)",
                    (new_id("LNK"), s[0], m[0], json.dumps(reasons, ensure_ascii=False), utcnow()),
                )
                added += cur.rowcount
    # 2) Same normalized title.
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
