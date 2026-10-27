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
# "推奨技能：…", "準 推奨：…", "必須技能", and the softer "振る機会がある技能" /
# "使える技能" / "場合によっては使うかも", which read as 準推奨 (SEMI).
_SKILL_LABEL = re.compile(r"(?P<lv>準\s*推奨|推奨|必須)\s*(技能|スキル)|^[・▶●◆■]?\s*(?P<bare>推奨)\s*(?=[:：])|(?P<semi>準\s*推奨|振る機会(が|の)?ある技能|使える技能|場合によっては使うかも)(?=\s*[(（:：])")
_NOT_REC = re.compile(r"非推奨\s*[:：]\s*(.+)|[:：]\s*([^:：]{1,20}?)\s*非推奨")
_STATUS_LABEL = re.compile(r"推奨\s*(ステータス|能力値|ステ(?!ージ)|status)|(STR|CON|POW|DEX|APP|SIZ|INT|EDU|SAN)\s*\d+\s*以上", re.I)
_NONE = re.compile(r"^(特に)?(なし|無し|ありません|不要|自由|なんでも|何でも)")
_PER_HO = re.compile(r"HO\s*(ごと|毎|別)|各\s*HO|HOに(記載|よる)")


def _value_after(ls: list[str], k: int, m: re.Match) -> str:
    """The text after a label ("推奨技能：目星、図書館" / "【推奨技能】目星" /
    "準推奨技能(誰か持っていると良い)：…"). An empty value means the list is on
    the next line; a list ending in "、" goes on over the next lines."""
    rest = re.sub(r"^\s*[（(][^）)]*[）)]\s*(?=[:：])", "", ls[k][m.end():])
    v = re.sub(r"^[\s】」』\]）)>＞:：…・\-=]+", "", rest).strip()
    j = k + 1
    if not v and j < len(ls) and not re.search(r"[:：】]", ls[j][:12]):
        v, j = ls[j], j + 1
    while v.endswith(("、", ",")) and j < len(ls) and not re.match(r"[をがはも]|[^、,]*[:：]", ls[j]):
        v, j = v + ls[j], j + 1
    return v


def _split_skills(v: str) -> list[str]:
    v = re.sub(r"[（(][^）)]*(なくても|あれば|あったら|振る機会|など|代用|代替|スムーズ|便利)[^）)]*[）)]", "", v)
    # Keep "芸術(歌唱、演技)" whole: hide separators inside brackets while splitting.
    v = re.sub(r"[（(][^）)]*[）)]", lambda m: m.group(0).replace("、", "\0").replace(",", "\1"), v)
    parts = re.split(r"[、,，/／・\s]+|(?<=[>》＞」〉])\s*(?=[<《＜「〈])|or|もしくは|または|及び|および|と(?=[<《＜「〈])", v)
    out = []
    for p in parts:
        p = (p or "").replace("\0", "、").replace("\1", ",").strip(" <>《》＜＞〈〉「」『』[]【】。.")
        if p.count("(") != p.count(")"):
            p = p.strip("()")
        if p and len(p) <= 20 and p not in out and not re.search(r"該当|その他|など$|HO", p):
            out.append(p)
    return out


def extract_skills(text: str) -> list[Hit]:
    hits: list[Hit] = []
    ls = lines(text)
    for k, ln in enumerate(ls):
        if _TRANSLATION.search(ln):
            continue
        m = _SKILL_LABEL.search(ln)
        # "推奨技能を追記しました" is an update note, not a list.
        if m and not re.match(r"\s*(を|の|が|は)", ln[m.end():]):
            v = _value_after(ls, k, m)
            if m.group("semi") or (m.group("lv") or "").startswith("準"):
                level = "SEMI"
            else:
                level = "REQUIRED" if m.group("lv") == "必須" else "RECOMMENDED"
            per_ho = bool(_PER_HO.search(v))
            if _NONE.search(v):
                val = {"level": level, "skills": _split_skills(re.sub(_NONE, "", v)), "none": True, "per_ho": False}
            else:
                skills = _split_skills(v)
                if not skills and not per_ho:
                    continue
                val = {"level": level, "skills": skills, "none": False, "per_ho": per_ho}
            # "推奨技能：なし" followed by "使える技能：目星…": the list is the answer.
            if (hits and m.group("semi") and m.group("semi").startswith("使える") and hits[-1].value.get("none")
                    and not hits[-1].value["skills"] and hits[-1].excerpt == ls[k - 1]):
                hits.pop()
            hits.append(Hit("scenario_conditions", {"category": "SKILL", **val}, ln))
        elif nm := _NOT_REC.search(ln):
            what = (nm.group(1) or nm.group(2)).strip()
            what = re.sub(r"^低すぎる", "低", what)
            hits.append(Hit("scenario_conditions", {"category": "SKILL", "level": "NOT_RECOMMENDED", "skills": _split_skills(what),
                                                    "none": False, "per_ho": False}, ln, confidence=0.6))
        elif m := _STATUS_LABEL.search(ln):
            v = _value_after(ls, k, m) if m.group(1) else ln
            if v:
                hits.append(Hit("scenario_conditions", {"category": "STATUS", "text": v[:120]}, ln, confidence=0.6))
    return hits


# Chinese translations of the page repeat the labels (推荐技能 / 推薦技能).
_TRANSLATION = re.compile(r"推荐|推薦|游玩|侦查|偵查")


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
        if re.search(r"救済|探索者を|調整案|NPC\s*ロスト", ln):
            continue
        if not m:
            # Unlabelled: "ロスト可能性あり", "後遺症、ロストの可能性あり"
            if re.search(r"ロスト(の)?可能性\s*(あり|有|がある)|ロスト(あり|有り)(?!ません)", ln):
                yield Hit("scenario_conditions", {"category": "LOSS", "level": "", "flags": ["POSSIBLE"]}, ln, confidence=0.5)
                return
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
        if not found and re.search(r"^(あり|有り|有|ある)|あり$|有り$|死ぬ|かもしれ|可能性|あり得る|ありえる", v):
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
_ALLOW = re.compile(r"禁止して(い)?ません|自由|(?<!不)可能|(?<!不)可(?!能)|OK|ok|許可|大丈夫|構いません|かまいません|歓迎|どうぞ|問題(ありません|ない)|お任せ|推奨|案")
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
# Tags group the listed elements for search; the element text itself is kept.
CONTENT_TAGS = [
    ("GORE", r"グロ|流血|出血|欠損|眼球|残虐|猟奇|解体|内臓|R-?15\s*G|G-?15|R-?18\s*G|ゴア"),
    ("VIOLENCE", r"暴力|暴言|虐待|拷問|過激な発言|糾弾|いじめ"),
    ("SUICIDE_SELF_HARM", r"自殺|自傷|自死|希死"),
    ("DEATH", r"死亡|死別|死ネタ|命の軽い|人の死|死の描写|死体|死\s*[(（]|死を想起"),
    ("CHILD_HARM", r"子供の死|子どもの死|未成年[^。]{0,8}(残虐|暴力|死)|児童"),
    ("SEXUAL", r"性的|性描写|性暴力|R-?18(?!\s*G)|R-?15(?!\s*G)"),
    ("ROMANCE", r"恋愛|ロマンス|(?<![A-Za-z])(BL|GL|NL)(?![A-Za-z])|感情を寄せ|好意を向け|同性愛|キス|うちよそ"),
    ("MENTAL_HEALTH", r"精神病|精神疾患|精神的に|鬱|うつ病"),
    ("MEDICAL", r"医療|病院|病気|ホスピス|手術|疾患|妊娠|堕胎|薬物"),
    ("JUMPSCARE", r"ジャンプスケア|ホラー画像|びっくり"),
    ("PVP", r"PvP|PVP|PC\s*vs\s*PC|PC同士の(対立|争い)|探索者同士の(対立|争い)|疑心暗鬼|裏切り"),
    ("UNFAIR_BAD_END", r"理不尽|胸糞|後味(が|の)悪|バッドエンド|救いがない|救いのない|鬱展開|確定ロスト"),
    ("AFTEREFFECT", r"後遺症|欠損"),
    ("PC_BACKGROUND_CHANGE", r"設定(を|が)?(付与|後付け|追加)|把握していない設定|設定改変|記憶喪失"),
    ("EMOTION_CONTROL", r"感情[^。]{0,4}(誘導|指定|制限)|行動[^。]{0,4}(指定|制限)|RP[^。]{0,10}制限|感情指定"),
    ("MYTHOS_INTERPRETATION", r"独自の?解釈|自己解釈|オリジナル(の)?(設定|要素|神話生物)"),
    ("ETHICS_THEME", r"倫理|センシティブな(職業|題材|テーマ)"),
    ("DISCRIMINATION_RELIGION_WAR", r"差別|宗教|戦争|政治|犯罪"),
    ("INSECT_TENTACLE", r"触手|虫|蟲"),
    ("LONG_DESCRIPTION", r"長文の描写"),
]
# A heading that introduces a list of elements: every listed element is kept.
_CW_LIST = re.compile(r"含まれる(地雷)?要素|(以下|これら)の(要素|表現|描写)|要素を含|地雷要素|含まれる地雷")
# A general warning heading: only elements that name a sensitive topic are kept.
_CW_HEAD = re.compile(r"注意事項|地雷|苦手な(方|要素)|センシティブ|閲覧注意|含まれています|含みます|含まれます")
_CW_SKIP = re.compile(r"一切の?関係|関係ありません|実在の|転載|配布|ネタバレ|ふせったー|フィクション|規約|動画|配信|SNS|購入|PDF|pdf|版で|プレイ可能|無断|質問|お問い?合わせ")
_HEADING = re.compile(r"^[■□◆◇▼▽●○▍❚｜|【『<〈]|^[^\s]{1,14}[】』〉>]$")


def content_tags(text: str) -> list[str]:
    return [code for code, rx in CONTENT_TAGS if re.search(rx, text or "")]


def _joined(ls: list[str]) -> list[str]:
    """Join a list that wraps ("A ／ B ／" + "C ／ D")."""
    out: list[str] = []
    for ln in ls:
        if out and re.search(r"[／/、]$", out[-1]):
            out[-1] += ln
        else:
            out.append(ln)
    return out


def extract_content_warnings(text: str) -> list[Hit]:
    """Elements under a warning heading ("■注意事項", "▍含まれる要素",
    "【含まれる地雷要素】", "これらの要素を含む"), plus R-15G style ratings."""
    ls = _joined(lines(text))
    items: list[str] = []
    excerpt: list[str] = []

    def take(part: str, keep_all: bool) -> None:
        part = part.strip(" ■□◆◇●○・-")
        if part and len(part) <= 40 and part not in items and (keep_all or content_tags(part)):
            items.append(part)

    k = 0
    while k < len(ls):
        ln = ls[k]
        if (_CW_LIST.search(ln) or _CW_HEAD.search(ln)) and not re.search(r"追記|頒布|改訂|追加|更新", ln):
            keep_all = bool(_CW_LIST.search(ln))
            block = [ln]
            j = k + 1
            while j < len(ls) and j <= k + 12 and not (_HEADING.search(ls[j]) and not ls[j].startswith(("・", "●"))):
                block.append(ls[j])
                j += 1
            for b in block:
                if _CW_LIST.search(b):
                    keep_all = True  # "■注意事項" … "・以下の要素を含みます。"
                    after = re.sub(r"^.*?(要素|表現|描写|含む|含みます|含まれます)[^:：】]*[:：】]?\s*。?", "", b)
                    if after == b or not after:
                        continue
                    b = after
                elif _CW_SKIP.search(b):
                    continue
                elif b is block[0] and not re.search(r"[:：】]\s*\S", b):
                    # "軽度のグロ描写が含まれます。": the heading line is the element.
                    if content_tags(b) and len(b) <= 60:
                        take(re.sub(r"^[^\w(（]+|(が|を)?(含まれ|含み)[^。]*。?$", "", b), True)
                        excerpt.append(b)
                    continue
                b = re.sub(r"^[^:：]{0,12}[:：】]", "", b)
                if keep_all and len(b) > 30 and b.endswith("。") and not re.search(r"[／/]", b):
                    continue  # a sentence after the list, not an element
                seps = r"[/／]" if re.search(r"[／/]", b) else r"[・、,]|\s{2,}"
                for part in re.split(seps, b):
                    take(part, keep_all and len(part.strip()) <= 30)
                excerpt.append(b)
            k = j
            continue
        if (re.search(r"R-?1[58]\s*G?|G-?1[58]", ln) and ln not in excerpt
                and not re.search(r"R-?1[58]\S{0,6}(じゃ|では)(ない|ありません)", ln)):
            items.append(re.search(r"[RG]-?1[58]\s*G?", ln).group(0))
            excerpt.append(ln)
        k += 1
    if not items:
        return []
    tags = list(dict.fromkeys(t for it in items for t in content_tags(it)))
    return [Hit("scenario_conditions", {"category": "CONTENT_WARNING", "tags": tags, "items": items[:30]},
                " / ".join(dict.fromkeys(excerpt))[:500], confidence=0.5)]


def extract_tendency(text: str) -> list[Hit]:
    return extract_skills(text) + list(extract_loss(text)) + extract_modification(text) + extract_content_warnings(text)
