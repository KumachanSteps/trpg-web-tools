"""Rule-based extraction from description text (source priority 2-3).

Every hit keeps the line it came from so it can be stored as extraction
evidence. No hit means "unknown", never "false".
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field


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
_SAMPLE_RE = re.compile(r"サンプル|試し読み|体験版|お試し|プレビュー|preview|sample|概要", re.I)
_FREE_EDITION_RE = re.compile(r"無料版|フリー版|free\s*edition", re.I)
_ASSET_RE = re.compile(r"素材|立ち絵|スチル|BGM|背景|ルームデータ|部屋データ|ココフォリア|ユドナリウム|画像のみ|asset", re.I)
_FULL_RE = re.compile(r"シナリオ|本編|完全版|PDF|テキスト|集|セット|全話|scenario", re.I)


def classify_edition_kind(label: str) -> str:
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


def extract_systems(text: str) -> list[Hit]:
    hits: list[Hit] = []
    seen = set()
    for ln in lines(text):
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


# -- session modes --------------------------------------------------------------
_RANGE_PL = re.compile(r"(?:PL|プレイヤー|人数)\s*[::]?\s*(\d+)\s*(?:~\s*(\d+))?\s*(?:人|名)?|(\d+)\s*(?:~\s*(\d+))?\s*(?:PL|人用)", re.I)
_COMPANION = re.compile(r"\b(KPC|DPC)\b|(KPC|DPC)")


def extract_session_modes(text: str) -> list[Hit]:
    hits: list[Hit] = []
    for ln in lines(text):
        companion = None
        if m := _COMPANION.search(ln):
            companion = (m.group(1) or m.group(2)).upper()
        facilitator = "DL" if re.search(r"\bDL\b|ダイスロール担当", ln) else ("KP" if re.search(r"KP", ln) else None)

        if re.search(r"KPレス|GMレス|DLレス|KP不要|GM不要|一人で遊べる|ひとりで遊べる|ソロジャーナル", ln, re.I):
            hits.append(Hit("scenario_session_modes", {"mode": "GMLESS_SOLO", "player_min": 1, "player_max": 1, "facilitator_role": "NONE", "companion_role": companion or "UNKNOWN"}, ln))
            continue
        if re.search(r"タイマン|KP\s*1\s*[::/]?\s*PL\s*1", ln, re.I):
            hits.append(Hit("scenario_session_modes", {"mode": "ONE_ON_ONE", "player_min": 1, "player_max": 1, "facilitator_role": facilitator or "KP", "companion_role": companion or "UNKNOWN"}, ln))
            continue
        if re.search(r"ソロ(シナリオ|用|向け|プレイ)?", ln) and not re.search(r"ソロジャーナル", ln):
            hits.append(Hit("scenario_session_modes", {"mode": "SOLO", "player_min": 1, "player_max": 1, "facilitator_role": facilitator or "UNKNOWN", "companion_role": companion or "UNKNOWN"}, ln))
            continue
        m = _RANGE_PL.search(ln)
        if not m:
            continue
        lo = int(m.group(1) or m.group(3))
        hi = int(m.group(2) or m.group(4) or lo)
        if lo < 1 or hi < lo:
            continue
        if lo == hi == 1:
            # 1PL alone does not say whether a KP runs it; only a KPC/DPC
            # companion is evidence of a KP + 1PL table.
            mode = "ONE_ON_ONE" if companion else "ONE_PLAYER_UNSPECIFIED"
        else:
            mode = "MULTI_PL"
        hits.append(Hit("scenario_session_modes", {"mode": mode, "player_min": lo, "player_max": hi, "player_fixed": 1 if lo == hi else 0, "facilitator_role": facilitator or "UNKNOWN", "companion_role": companion or "UNKNOWN"}, ln))
    return hits


# -- durations ------------------------------------------------------------------
_TIME = re.compile(r"(約|およそ|目安)?\s*(\d+(?:\.\d+)?)\s*(?:~\s*(\d+(?:\.\d+)?))?\s*(時間|h|分)(?:程度|前後|ほど)?", re.I)


def _minutes(v: str, unit: str) -> int:
    return round(float(v) * (1 if unit == "分" else 60))


def extract_durations(text: str) -> list[Hit]:
    hits: list[Hit] = []
    for ln in lines(text):
        if not re.search(r"時間|プレイ|ボイセ|テキセ|ボイス|テキスト|半テキ|想定|所要|導入|\d\s*分", ln):
            continue
        # Split one line like "ボイセ3時間/テキセ6時間" into per-medium segments.
        segments = re.split(r"[/、,|]|\s{2,}", ln) if re.search(r"ボイ.*テキ|テキ.*ボイ", ln) else [ln]
        for seg in segments:
            m = _TIME.search(seg)
            if not m:
                continue
            if re.search(r"半テキ|セミテキ", seg):
                mode = "SEMI_TEXT"
            elif re.search(r"ボイセ|ボイス|voice", seg, re.I):
                mode = "VOICE"
            elif re.search(r"テキセ|テキスト|text", seg, re.I):
                mode = "TEXT"
            else:
                mode = "UNSPECIFIED"
            if re.search(r"導入|プロローグ|intro", ln, re.I):
                scope = "INTRO"
            elif re.search(r"全\s*\d*\s*話|全編|合計|通し", ln):
                scope = "ALL_EPISODES"
            elif re.search(r"各話|1話|一話|第\d+話", ln):
                scope = "EPISODE"
            elif re.search(r"本編", ln):
                scope = "MAIN"
            else:
                scope = "UNSPECIFIED"
            lo = _minutes(m.group(2), m.group(4))
            hi = _minutes(m.group(3), m.group(4)) if m.group(3) else lo
            if hi < lo:
                continue
            approx = 1 if (m.group(1) or re.search(r"程度|前後|ほど|目安|想定", seg)) else 0
            hits.append(Hit("scenario_durations", {"mode": mode, "scope": scope, "min_minutes": lo, "max_minutes": hi, "approximate": approx}, ln))
    return hits


# -- assets ---------------------------------------------------------------------
_ASSET_TYPES = [
    ("NPC_IMAGE", re.compile(r"立ち?絵|NPC画像|キャラクター画像", re.I)),
    ("STILL_IMAGE", re.compile(r"スチル", re.I)),
    ("TRAILER_IMAGE", re.compile(r"トレーラー|トレイラー", re.I)),
    ("BGM_LIST", re.compile(r"BGMリスト|使用BGM|BGM一覧", re.I)),
    ("BGM_AUDIO", re.compile(r"BGM(?!リスト|一覧)|音楽データ", re.I)),
    ("BACKGROUND", re.compile(r"背景")),
    ("ROOM_ZIP", re.compile(r"ルームデータ|部屋データ|ココフォリア用|ユドナリウム用|zip", re.I)),
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
