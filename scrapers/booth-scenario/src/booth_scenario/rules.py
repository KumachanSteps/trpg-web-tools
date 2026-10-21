"""Rule-based extraction from description text (source priority 2-3).

Every hit keeps the line it came from so it can be stored as extraction
evidence. No hit means "unknown", never "false".
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass


def normalize(text: str) -> str:
    """NFKC (full-width digits/letters -> ASCII) and unify range marks."""
    t = unicodedata.normalize("NFKC", text)
    t = re.sub(r"[〜～−–—]", "~", t)
    # "ー" is a range mark only between digits (3ー4時間); elsewhere it is the
    # prolonged sound mark in words like プレイヤー / ソロジャーナル.
    return re.sub(r"(?<=\d)\s*ー\s*(?=\d)", "~", t)


def lines(text: str) -> list[str]:
    return [ln.strip() for ln in normalize(text).splitlines() if ln.strip()]


@dataclass
class Hit:
    field_path: str
    value: dict
    excerpt: str
    method: str = "REGEX"
    confidence: float = 0.7


# -- variants -----------------------------------------------------------------
_SAMPLE_RE = re.compile(r"サンプル|試し読み|試読|体験版|お試し|プレビュー|preview|sample|概要", re.I)
_FREE_EDITION_RE = re.compile(r"無料版|フリー版|free\s*edition", re.I)
_ASSET_RE = re.compile(r"素材|立ち絵|スチル|BGM|背景|ルームデータ|部屋データ|ココフォリア|ユドナリウム|画像|壁紙|待ち受け|主題歌|特典|ディスプレイ|アイコン|グッズ|asset", re.I)
# Scenario text is in the variant: "本編PDF＋素材", "素材同梱版" still carry the scenario.
_FULL_RE = re.compile(r"シナリオ|本編|本文|完全版|PDF|テキスト|集|全話|データ版|冊子|書籍|通常版|有料版|配信用|同梱|付き|＋|\+|scenario", re.I)


def classify_edition_kind(label: str) -> str:
    """From the variant label alone. Labels that are just the product title
    stay UNKNOWN here; organize resolves them with product context."""
    t = normalize(label)
    if _SAMPLE_RE.search(t):
        return "SAMPLE"
    if _FREE_EDITION_RE.search(t):
        return "FREE_PLAYABLE_EDITION"
    if _ASSET_RE.search(t) and not _FULL_RE.search(t):
        return "ASSET_ONLY"
    if _FULL_RE.search(t):
        return "FULL"
    return "UNKNOWN"


# -- systems ------------------------------------------------------------------
_SYS_PATTERNS = [
    ("COC7", re.compile(r"新クトゥルフ|CoC\s*7|7版|第7版|7th", re.I)),
    ("COC6", re.compile(r"(?<!新)クトゥルフ神話TRPG|CoC\s*6|6版|6th", re.I)),
    ("EMOKLORE", re.compile(r"エモクロア|emoklore", re.I)),
]


_COC6_EXPLICIT = re.compile(r"CoC\s*6|6版|6th", re.I)


# Rights notices name the game ("『クトゥルフ神話TRPG』の二次創作物") without saying
# which edition the scenario is for.
_RIGHTS_LINE = re.compile(r"権利を有する|二次創作|著作権|ガイドライン|©|ⓒ|KADOKAWA|アークライト|Chaosium", re.I)


def extract_systems(text: str) -> list[Hit]:
    hits: list[Hit] = []
    seen = set()
    for ln in lines(text):
        if _RIGHTS_LINE.search(ln):
            continue
        if re.search(r"変換|コンバート|convert", ln, re.I):
            support = "CONVERSION_PATCH" if re.search(r"パッチ|変換表|変換データ|patch", ln, re.I) else "CONVERTIBLE"
        elif re.match(r"^[\[【■◆●・]?\s*(使用)?システム|^system", ln, re.I):
            support = "NATIVE"
        elif "対応" in ln:
            support = "SUPPORTED"
        else:
            continue
        for code, rx in _SYS_PATTERNS:
            if rx.search(ln) and (code, support) not in seen:
                # "新クトゥルフ神話TRPG" also contains "クトゥルフ神話TRPG".
                if code == "COC6" and _SYS_PATTERNS[0][1].search(ln) and not _COC6_EXPLICIT.search(ln):
                    continue
                seen.add((code, support))
                hits.append(Hit("scenario_systems", {"system_code": code, "support_type": support}, ln))
    return hits


_COC7_META = re.compile(r"新クトゥルフ|CoC\s*7|7版|7th", re.I)
_COC6_META = re.compile(r"CoC\s*6|6版|6th", re.I)
_COC_META = re.compile(r"クトゥルフ|CoC|克苏鲁", re.I)
_EMO_META = re.compile(r"エモクロア|emoklore", re.I)


def extract_systems_meta(title: str, tags: list[str]) -> list[Hit]:
    """Systems named in the product title or tags. In Japanese listings plain
    "クトゥルフ神話TRPG"/"CoC" means the 6th edition; 新クトゥルフ means 7th."""
    hits: list[Hit] = []
    for source, text in (("title", title or ""), ("tags", " ".join(tags or []))):
        t = normalize(text)
        codes = []
        if _COC7_META.search(t):
            codes.append("COC7")
        if _COC6_META.search(t) or (_COC_META.search(t) and not _COC7_META.search(t)):
            codes.append("COC6")
        if _EMO_META.search(t):
            codes.append("EMOKLORE")
        for code in codes:
            hits.append(Hit("scenario_systems", {"system_code": code, "support_type": "NATIVE"}, f"[{source}] {text}"[:300], method="RULE", confidence=0.8 if source == "title" else 0.6))
    seen, out = set(), []
    for h in hits:
        if h.value["system_code"] not in seen:
            seen.add(h.value["system_code"])
            out.append(h)
    return out


# -- session modes --------------------------------------------------------------
_RANGE_PL = re.compile(
    r"(?:PL|プレイヤー|人\s*数|探索者数?|共鳴者数?)\s*(?:は|数)?\s*[::]?\s*(?:新規)?\s*(\d+)\s*(?:~\s*(\d+))?\s*(?:人|名)?"
    r"(?!\s*(?:~\s*\d+\s*)?(?:歳|才|年|月|日|時|分|%))"
    r"|(\d+)\s*(?:~\s*(\d+))?\s*(?:PL|人用|人\s*固定|名\s*固定)", re.I)
_COMPANION = re.compile(r"\b(KPC|DPC)\b|(KPC|DPC)")
_GMLESS = re.compile(r"KPレス|GMレス|DLレス|KP不要|GM不要|DL不要|一人で遊べる|ひとりで遊べる|ソロジャーナル", re.I)
_ONE_ON_ONE = re.compile(r"タイマン|KP\s*1\s*[::/]?\s*PL\s*1|一対一|1\s*対\s*1", re.I)


def extract_session_modes(text: str) -> list[Hit]:
    """Roles are left UNKNOWN unless the line says them; evidence fills the
    defaults (KP/DL, KPC/DPC for タイマン, NONE otherwise) once the system is known.
    One line can give several ("2PLまたはタイマン")."""
    hits: list[Hit] = []

    def add(mode, lo, hi, fac, comp, ln, fixed=None):
        v = {"mode": mode, "player_min": lo, "player_max": hi, "facilitator_role": fac, "companion_role": comp}
        if fixed is not None:
            v["player_fixed"] = fixed
        hits.append(Hit("scenario_session_modes", v, ln))

    for ln in lines(text):
        companion = None
        if m := _COMPANION.search(ln):
            companion = (m.group(1) or m.group(2)).upper()
        facilitator = "DL" if re.search(r"(?<![A-Za-z])DL(?![A-Za-z])|ダイスロール担当", ln) else ("KP" if re.search(r"KP(?!レス|不要)", ln) else None)
        m = _RANGE_PL.search(ln)
        lo = hi = None
        if m:
            lo = int(m.group(1) or m.group(3))
            hi = int(m.group(2) or m.group(4) or lo)
            if lo < 1 or hi < lo or hi > 30:
                lo = hi = None
        gmless, one_on_one = bool(_GMLESS.search(ln)), bool(_ONE_ON_ONE.search(ln))
        if gmless:
            if lo and hi >= 2:
                add("GMLESS_MULTI", lo, hi, "NONE", "NONE", ln, 1 if lo == hi else 0)
            else:
                add("GMLESS_SOLO", 1, 1, "NONE", "NONE", ln)
        if one_on_one:
            add("ONE_ON_ONE", 1, 1, facilitator or "UNKNOWN", companion or "UNKNOWN", ln)
        if gmless or one_on_one:
            # "2PLまたはタイマン": the player count is a separate way to play.
            if lo and hi >= 2 and not gmless:
                add("MULTI_PL", lo, hi, facilitator or "UNKNOWN", "UNKNOWN", ln, 1 if lo == hi else 0)
            continue
        if re.search(r"ソロ(シナリオ|用|向け|プレイ)?", ln):
            add("SOLO", 1, 1, facilitator or "UNKNOWN", companion or "UNKNOWN", ln)
            continue
        if lo is None:
            continue
        if lo == hi == 1:
            # One player with a KP; a named KPC/DPC makes it a タイマン table.
            add("ONE_ON_ONE" if companion else "SOLO", 1, 1, facilitator or "UNKNOWN", companion or "UNKNOWN", ln)
        else:
            add("MULTI_PL", lo, hi, facilitator or "UNKNOWN", companion or "UNKNOWN", ln, 1 if lo == hi else 0)
    # "2PL KPレス" elsewhere: lines that only say KPレス are about that same mode.
    if any(h.value["mode"] == "GMLESS_MULTI" for h in hits):
        hits = [h for h in hits if h.value["mode"] != "GMLESS_SOLO"]
    return hits


def default_roles(v: dict, systems: set[str]) -> dict:
    """Fill roles the text leaves open: KP for CoC, DL for Emoklore; タイマン
    plays against a KPC/DPC; otherwise there is no companion."""
    v = dict(v)
    if v["mode"].startswith("GMLESS"):
        v["facilitator_role"] = "NONE"
        if v.get("companion_role") in (None, "UNKNOWN"):
            v["companion_role"] = "NONE"
        return v
    fac = "DL" if "EMOKLORE" in systems and not systems & {"COC6", "COC7"} else ("KP" if systems & {"COC6", "COC7"} else None)
    if v.get("facilitator_role") in (None, "UNKNOWN") and fac:
        v["facilitator_role"] = fac
    if v.get("companion_role") in (None, "UNKNOWN"):
        if v["mode"] == "ONE_ON_ONE":
            v["companion_role"] = {"KP": "KPC", "DL": "DPC"}.get(v.get("facilitator_role"), "UNKNOWN")
        else:
            v["companion_role"] = "NONE"
    return v


# -- durations ------------------------------------------------------------------
# One time: "3時間", "1時間半", "1時間30分", "90分", "9h", "2.5時間".
_T = r"(\d+(?:\.\d+)?)\s*(時間|h|分)?\s*(半|\d+\s*分)?"
_TIME = re.compile(rf"(約|およそ|目安)?\s*{_T}\s*(?:(~|から|-)\s*(?:{_T})?)?(程度|前後|ほど|以上)?", re.I)


def _minutes(v: str, unit: str, extra: str | None) -> int:
    m = float(v) * (1 if unit == "分" else 60)
    if extra:
        m += 30 if extra == "半" else int(re.sub(r"\D", "", extra))
    return round(m)


OPEN_RANGE_EXTRA = 60  # "2時間~" is read as 2-3 hours (reviewer's convention)


def _time_range(seg: str):
    """(min, max) minutes of the first time range in seg. An open range
    ("3時間~", "2時間以上") gets OPEN_RANGE_EXTRA minutes on top."""
    for m in _TIME.finditer(seg):
        _, a, ua, ea, sep, b, ub, eb, tail = m.groups()
        if not (ua or ub) or (b and not ub and not ua):
            continue
        if ua == "分" and not ub and not sep and float(a) < 10:
            continue
        unit_a = ua or ub
        lo = _minutes(a, unit_a, ea)
        if b:
            hi = _minutes(b, ub or unit_a, eb)
        elif sep == "~" or tail == "以上":
            hi = lo + OPEN_RANGE_EXTRA
        else:
            hi = lo
        if hi is not None and hi < lo:
            continue
        return lo, hi, m
    return None


def extract_durations(text: str) -> list[Hit]:
    """Play time. A time that does not say text or voice counts as a voice
    session (the reviewer's convention)."""
    hits: list[Hit] = []
    ls = lines(text)
    for i, ln in enumerate(ls):
        # Notes right under the line ("※全エピソードを遊ぶ場合の時間") qualify it.
        notes = []
        for nl in ls[i + 1:i + 3]:
            if not nl.startswith(("※", "*")):
                break
            notes.append(nl)
        if not re.search(r"時間|プレイ|ボイセ|テキセ|ボイス|テキスト|半テキ|想定|所要|導入|\d\s*(分|h\b)", ln, re.I):
            continue
        # Split one line like "ボイセ3時間/テキセ6時間" into per-medium segments.
        segments = re.split(r"[/、,|]|\s{2,}", ln) if re.search(r"ボイ.*テキ|テキ.*ボイ", ln) else [ln]
        for seg in segments:
            r = _time_range(seg)
            if not r:
                continue
            lo, hi, m = r
            if re.search(r"半テキ|セミテキ", seg):
                mode = "SEMI_TEXT"
            elif re.search(r"ボイセ|ボイス|voice", seg, re.I):
                mode = "VOICE"
            elif re.search(r"テキ|text", seg, re.I):
                mode = "TEXT"
            else:
                mode = "VOICE"
            if re.search(r"導入|プロローグ|intro", ln, re.I):
                scope = "INTRO"
            elif re.search(r"全\s*\d*\s*(話|エピソード)|全編|合計|通し", ln) or any(re.match(r"[※*].{0,4}(全\s*\d*\s*(話|エピソード)|全編|合計|通し)", n) for n in notes):
                scope = "ALL_EPISODES"
            elif re.search(r"各話|1話|一話|第\d+話", ln):
                scope = "EPISODE"
            elif re.search(r"本編", ln):
                scope = "MAIN"
            else:
                scope = "UNSPECIFIED"
            approx = 1 if (m.group(1) or re.search(r"程度|前後|ほど|目安|想定|~\s*$|~\s*[(（]|以上", seg)) else 0
            hits.append(Hit("scenario_durations", {"mode": mode, "scope": scope, "min_minutes": lo, "max_minutes": hi, "approximate": approx}, ln))
    # A campaign that states its total is recorded by the total alone
    # (episode times are listed alongside it).
    if any(h.value["scope"] == "ALL_EPISODES" for h in hits):
        hits = [h for h in hits if h.value["scope"] in ("ALL_EPISODES", "INTRO")]
    return hits


# -- assets ---------------------------------------------------------------------
_ASSET_TYPES = [
    ("NPC_IMAGE", re.compile(r"立ち?絵|NPC画像|キャラクター画像", re.I)),
    ("STILL_IMAGE", re.compile(r"スチル", re.I)),
    ("TRAILER_IMAGE", re.compile(r"トレーラー|トレイラー", re.I)),
    ("BGM_LIST", re.compile(r"BGMリスト|使用BGM|BGM一覧", re.I)),
    ("BGM_AUDIO", re.compile(r"BGM(?!リスト|一覧)|音楽データ", re.I)),
    ("BACKGROUND", re.compile(r"背景")),
    ("ROOM_ZIP", re.compile(r"ルームデータ|部屋データ|ココフォリア用|ユドナリウム用|zip|room", re.I)),
    ("HANDOUT", re.compile(r"ハンドアウト")),
    ("APNG", re.compile(r"APNG", re.I)),
    ("MAP", re.compile(r"マップ|地図")),
]
_ABSENT = re.compile(r"なし|無し|ありません|付属しません|含まれません|同梱しておりません|ございません|×")
_SEPARATE = re.compile(r"別売|別途販売|別商品|別頒布")
_INCLUDED = re.compile(r"あり|有り|付属|同梱|収録|含む|入り|○|〇")


def _relation(text: str) -> str | None:
    if _ABSENT.search(text):
        return "EXPLICITLY_ABSENT"
    if _SEPARATE.search(text):
        return "SOLD_SEPARATELY"
    if _INCLUDED.search(text):
        return "INCLUDED"
    return None


def extract_assets(text: str) -> list[Hit]:
    """Relation is decided per clause ("BGMなし、立ち絵あり" -> two answers).
    A clause naming an asset without a marker borrows the line's marker only
    when the whole line has a single kind of marker."""
    hits: list[Hit] = []
    for ln in lines(text):
        clauses = [c for c in re.split(r"[、,/|;；]|\s+", ln) if c]
        line_kinds = {r for c in clauses if (r := _relation(c))}
        for clause in clauses:
            relation = _relation(clause) or (next(iter(line_kinds)) if len(line_kinds) == 1 else None)
            if relation is None:
                continue
            for atype, rx in _ASSET_TYPES:
                if rx.search(clause):
                    hits.append(Hit("scenario_assets", {"asset_type": atype, "availability_relation": relation}, ln, confidence=0.6))
    return hits


def extract_all(text: str) -> list[Hit]:
    return extract_systems(text) + extract_session_modes(text) + extract_durations(text) + extract_assets(text)
