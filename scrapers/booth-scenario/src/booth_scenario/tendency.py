"""Scenario tendency from the description: recommended skills and stats,
lost rate, what the author says about altering the scenario, and sensitive
(地雷) elements. Each answer is a Hit for scenario_conditions:

  SKILL            {"level": RECOMMENDED|SEMI|REQUIRED, "skills": [...], "none": bool, "per_ho": bool}
  STATUS           {"text": "..."}
  LOSS             {"level": "LOW" | "LOW-MID" | ..., "flags": [POSSIBLE|VARIABLE|HIDDEN]}
  MODIFICATION     {"stance": ALLOWED|CONDITIONAL|FORBIDDEN}
  CONTENT_WARNING  {"tags": [...], "items": [...]}
"""
from __future__ import annotations

import re

from .rules import Hit, lines

# -- recommended skills / stats ---------------------------------------------------
_SKILL_LABEL = re.compile(r"(準\s*推奨|推奨|必須)\s*(技能|スキル)")
_STATUS_LABEL = re.compile(r"推奨\s*(ステータス|能力値|ステ(?!ージ)|status)|(STR|CON|POW|DEX|APP|SIZ|INT|EDU|SAN)\s*\d+\s*以上", re.I)
_NONE = re.compile(r"^(特に)?(なし|無し|ありません|不要|自由|なんでも|何でも)")
_PER_HO = re.compile(r"HO\s*(ごと|毎|別)|各\s*HO|HOに(記載|よる)")


def _value_after(ln: str, m: re.Match, nxt: str | None) -> str:
    """The text after a label ("推奨技能：目星、図書館" / "【推奨技能】目星");
    an empty value means the list is on the next line."""
    v = re.sub(r"^[\s】」』\]）)>＞:：…・\-=]+", "", ln[m.end():]).strip()
    if not v and nxt and not re.search(r"[:：】]", nxt[:12]):
        v = nxt
    return v


def _split_skills(v: str) -> list[str]:
    v = re.sub(r"[（(][^）)]*(なくても|あれば|振る機会|など)[^）)]*[）)]", "", v)
    # Keep "芸術(歌唱、演技)" whole: hide separators inside brackets while splitting.
    v = re.sub(r"[（(][^）)]*[）)]", lambda m: m.group(0).replace("、", "\0").replace(",", "\1"), v)
    parts = re.split(r"[、,，/／・\s]+|(?<=[>》＞」])\s*(?=[<《＜「])|or|もしくは|または|or|及び|および|と(?=[<《＜「])", v)
    out = []
    for p in parts:
        p = (p or "").replace("\0", "、").replace("\1", ",").strip(" <>《》＜＞「」『』[]【】。.")
        if p.count("(") != p.count(")"):
            p = p.strip("()")
        if p and len(p) <= 20 and p not in out and not re.search(r"該当|その他|など$", p):
            out.append(p)
    return out


def extract_skills(text: str) -> list[Hit]:
    hits: list[Hit] = []
    ls = lines(text)
    for k, ln in enumerate(ls):
        nxt = ls[k + 1] if k + 1 < len(ls) else None
        if m := _SKILL_LABEL.search(ln):
            v = _value_after(ln, m, nxt)
            level = "SEMI" if m.group(1).startswith("準") else ("REQUIRED" if m.group(1) == "必須" else "RECOMMENDED")
            if _NONE.search(v):
                val = {"level": level, "skills": [], "none": True, "per_ho": False}
            elif _PER_HO.search(v):
                val = {"level": level, "skills": [], "none": False, "per_ho": True}
            else:
                skills = _split_skills(v)
                if not skills:
                    continue
                val = {"level": level, "skills": skills, "none": False, "per_ho": False}
            hits.append(Hit("scenario_conditions", {"category": "SKILL", **val}, ln))
        elif m := _STATUS_LABEL.search(ln):
            v = _value_after(ln, m, nxt) if m.group(1) else ln
            if v:
                hits.append(Hit("scenario_conditions", {"category": "STATUS", "text": v[:120]}, ln, confidence=0.6))
    return hits


# -- lost rate -------------------------------------------------------------------
_LEVELS = ["NONE", "LOW", "MID", "HIGH", "VERY_HIGH"]
_LEVEL_WORDS = [("VERY_HIGH", r"超高|激高|極高|最高|非常に高|かなり高|特高"), ("HIGH", r"高"), ("MID", r"中|普通|ふつう|そこそこ"),
                ("LOW", r"低|少な|ほぼ(なし|無し|ない)"), ("NONE", r"^(なし|無し|ない|無|0\s*%?)$|ロストなし|ロスト無し")]
_LOSS_LABEL = re.compile(r"ロスト\s*(率|の\s*可能性|有無)?\s*[:：】\]]|【\s*ロスト\s*(率)?\s*】|ロスト率")


def _level(word: str) -> str | None:
    for code, rx in _LEVEL_WORDS:
        if re.search(rx, word):
            return code
    return None


def extract_loss(text: str) -> list[Hit]:
    """"ロスト率：低" / "【ロスト】あり" / "ロスト率：中~高" / "ロスト率：■■".
    Only a labelled value counts: "ロスト救済" or "ロスト探索者" say nothing of the rate."""
    for ln in lines(text):
        m = _LOSS_LABEL.search(ln)
        if not m or re.search(r"救済|探索者を|調整案|NPC\s*ロスト", ln):
            continue
        v = re.sub(r"^[\s】\]:：…・]+", "", ln[m.end():]).strip()
        v = re.split(r"[/／|｜]|\s{2,}|(?<=[低中高い])[、,]\s*(?!\s*[低中高])", v)[0] if v else v
        if not v:
            continue
        flags = []
        if re.search(r"[■□●？?]{1,}|秘匿|ネタバレ|ひみつ|秘密|非公開", v):
            flags.append("HIDDEN")
        if re.search(r"可変|変動|選択|次第|による|ルート|エンド", v):
            flags.append("VARIABLE")
        found = []
        for part in re.split(r"~|から|〜|-|ー|→|/|or|または|もしくは", v):
            if (lv := _level(part.strip())) and lv not in found:
                found.append(lv)
        if not found and re.search(r"^(あり|有り|有|ある)|あり$|有り$", v):
            flags.append("POSSIBLE")
        if not found and not flags:
            continue
        found.sort(key=_LEVELS.index)
        level = "-".join([found[0], found[-1]] if len(found) > 1 else found)
        yield Hit("scenario_conditions", {"category": "LOSS", "level": level, "flags": flags}, ln)
        return


# -- altering the scenario (改変) -------------------------------------------------
_MOD = re.compile(r"改変|改造|アレンジ")
_MOD_LABEL = re.compile(r"(改変|アレンジ)\s*[:：】]\s*(.+)")
_ALLOW = re.compile(r"禁止して(い)?ません|自由|可能|可(?!能)|OK|ok|許可|大丈夫|構いません|かまいません|歓迎|どうぞ|問題(ありません|ない)|お任せ|推奨|案")
_FORBID = re.compile(r"禁止(?!して(い)?ません|ではありません|しない)|不可|お止め|おやめ|お控え|控えて|NG|ご遠慮|しないで|しないでください|認めて(い)?ません|できません")
_COND = re.compile(r"条件|範囲(で|内)|以外|ただし|但し|限り|沿って|場合は|一部|描写|お問い?合わせ|ご連絡|確認")
# "改変データの配布" / "改変したシナリオを含む二次配布" are about redistribution, not play.
_REDISTRIBUTE = re.compile(r"(配布|転載|頒布|販売|アップロード|公開)")


def extract_modification(text: str) -> list[Hit]:
    stances: list[tuple[str, str]] = []
    for ln in lines(text):
        if not _MOD.search(ln):
            continue
        if m := _MOD_LABEL.search(ln):
            v = m.group(2)
            stance = ("CONDITIONAL" if _COND.search(v) else "FORBIDDEN" if _FORBID.search(v)
                      else "ALLOWED" if _ALLOW.search(v) else None)
            if stance:
                stances.append((stance, ln))
            continue
        if _REDISTRIBUTE.search(ln) and not re.search(r"改変(は|も|を)?\s*(自由|可|OK)", ln):
            continue
        allow, forbid = bool(_ALLOW.search(ln)), bool(_FORBID.search(ln))
        if allow and (forbid or _COND.search(ln)):
            stances.append(("CONDITIONAL", ln))
        elif forbid:
            stances.append(("FORBIDDEN", ln))
        elif allow:
            stances.append(("ALLOWED", ln))
    if not stances:
        return []
    kinds = {s for s, _ in stances}
    stance = next(iter(kinds)) if len(kinds) == 1 else "CONDITIONAL"
    excerpt = " / ".join(dict.fromkeys(ln for _, ln in stances))
    return [Hit("scenario_conditions", {"category": "MODIFICATION", "stance": stance}, excerpt[:500], confidence=0.6)]


# -- sensitive / 地雷 elements ------------------------------------------------------
CONTENT_TAGS = [
    ("GORE", r"グロ|流血|出血|欠損|眼球|残虐|猟奇|解体|内臓|R-?15\s*G|G-?15|R-?18\s*G|ゴア"),
    ("VIOLENCE", r"暴力|暴言|虐待|拷問|過激な発言|糾弾"),
    ("SUICIDE_SELF_HARM", r"自殺|自傷|自死|希死"),
    ("DEATH", r"死亡|死別|死ネタ|命の軽い|人の死|死の描写|死体"),
    ("CHILD_HARM", r"子供の死|子どもの死|未成年[^。]{0,8}(残虐|暴力|死)|児童"),
    ("SEXUAL", r"性的|性描写|性暴力|R-?18(?!\s*G)"),
    ("ROMANCE", r"恋愛|ロマンス|(?<![A-Za-z])(BL|GL|NL)(?![A-Za-z])|感情を寄せ|好意を向け"),
    ("MENTAL_HEALTH", r"精神病|精神疾患|精神的に|鬱|うつ病"),
    ("MEDICAL", r"医療|病院|病気|ホスピス|手術|疾患"),
    ("JUMPSCARE", r"ジャンプスケア|ホラー画像|びっくり"),
    ("PVP", r"PvP|PVP|PC\s*vs\s*PC|PC同士の(対立|争い)|探索者同士の(対立|争い)|疑心暗鬼|裏切り"),
    ("UNFAIR_BAD_END", r"理不尽|胸糞|後味が悪|バッドエンド|救いがない|救いのない|鬱展開"),
    ("AFTEREFFECT", r"後遺症|欠損"),
    ("PC_BACKGROUND_CHANGE", r"設定(を|が)?(付与|後付け|追加)|把握していない設定|設定改変"),
    ("MYTHOS_INTERPRETATION", r"独自解釈|自己解釈|オリジナル(の)?(設定|要素|神話生物)"),
    ("DISCRIMINATION_RELIGION_WAR", r"差別|宗教|戦争|政治|犯罪"),
    ("INSECT_TENTACLE", r"触手|虫|蟲"),
    ("LONG_DESCRIPTION", r"長文の描写"),
]
_CW_HEAD = re.compile(r"注意事項|含まれる(地雷)?要素|地雷|以下の(要素|表現|描写)|苦手な(方|要素)|センシティブ|閲覧注意|含まれています|含みます|含まれます")
_CW_SKIP = re.compile(r"転載|配布|ネタバレ|ふせったー|フィクション|規約|動画|配信|SNS|購入|PDF|pdf|版で|プレイ可能|無断|質問|お問い?合わせ")
_HEADING = re.compile(r"^[■□◆◇▼▽●○▍❚｜|【『<〈]|^[^\s]{1,14}[】』〉>]$")


def extract_content_warnings(text: str) -> list[Hit]:
    """Elements listed under a warning heading ("■注意事項", "▍含まれる要素",
    "【含まれる地雷要素】"), plus R-15G style ratings anywhere."""
    ls = lines(text)
    items: list[str] = []
    excerpt: list[str] = []
    k = 0
    while k < len(ls):
        ln = ls[k]
        if _CW_HEAD.search(ln) and not re.search(r"追記|頒布|改訂|追加|更新", ln):
            block = [ln]
            j = k + 1
            while j < len(ls) and j <= k + 12 and not (_HEADING.search(ls[j]) and not ls[j].startswith(("・", "●")) and j > k + 1):
                block.append(ls[j])
                j += 1
            for b in block:
                if _CW_SKIP.search(b):
                    continue
                for part in re.split(r"[/／・、,]|\s{2,}", re.sub(r"^.*?[:：】]", "", b) if b is block[0] else b):
                    part = part.strip(" ■□◆◇●○・-")
                    if part and len(part) <= 40 and any(re.search(rx, part) for _, rx in CONTENT_TAGS) and part not in items:
                        items.append(part)
                excerpt.append(b)
            k = j
            continue
        if (re.search(r"R-?1[58]\s*G?|G-?1[58]", ln) and ln not in excerpt
                and not re.search(r"R-?1[58]\S{0,6}(じゃ|では)(ない|ありません)", ln)):
            items.append(re.search(r"[RG]-?1[58]\s*G?", ln).group(0))
            excerpt.append(ln)
        k += 1
    tags = [code for code, rx in CONTENT_TAGS if any(re.search(rx, it) for it in items)]
    if not tags:
        return []
    return [Hit("scenario_conditions", {"category": "CONTENT_WARNING", "tags": tags, "items": items[:20]},
                " / ".join(dict.fromkeys(excerpt))[:500], confidence=0.5)]


def extract_tendency(text: str) -> list[Hit]:
    return extract_skills(text) + list(extract_loss(text)) + extract_modification(text) + extract_content_warnings(text)
