from booth_scenario.tendency import extract_tendency


def vals(text, cat):
    return [h.value for h in extract_tendency(text) if h.value["category"] == cat]


def test_skills_and_status():
    v = vals("【推奨技能】《目星》《図書館》《芸術(歌唱、演技)》\n【準推奨技能】図書館、コンピューター(なくても問題ないが振る機会は多い)", "SKILL")
    assert v[0]["skills"] == ["目星", "図書館", "芸術(歌唱、演技)"] and v[0]["level"] == "RECOMMENDED"
    assert v[1]["level"] == "SEMI" and v[1]["skills"] == ["図書館", "コンピューター"]
    assert vals("推奨技能：なし", "SKILL")[0]["none"]
    assert vals("推奨技能：HOごとに記載", "SKILL")[0]["per_ho"]
    assert vals("【必須技能】\n英語30%以上", "SKILL")[0]["level"] == "REQUIRED"
    assert vals("・SAN50以上推奨", "STATUS")[0]["text"] == "・SAN50以上推奨"


def test_lost_rate():
    level = lambda t: (vals(t, "LOSS") or [{}])[0]
    assert level("ロスト率：中～高")["level"] == "MID-HIGH"
    assert level("【ロスト】あり")["flags"] == ["POSSIBLE"]
    assert level("ロスト率：■■")["flags"] == ["HIDDEN"]
    assert level("ロスト率:中~高(選択次第で変動)") == {"category": "LOSS", "level": "MID-HIGH", "flags": ["VARIABLE"]}
    assert level("ロスト：なし")["level"] == "NONE"
    assert level("ＫＰのロスト探索者を救済できます") == {}
    assert level("●新規推奨(既存でも可能、しかしNPCロスト率高め)") == {}


def test_modification():
    stance = lambda t: (vals(t, "MODIFICATION") or [{}])[0].get("stance")
    assert stance("改変：許可") == "ALLOWED"
    assert stance("■改変：条件付き") == "CONDITIONAL"
    assert stance("背景に沿っていれば内容の改変はご自由にどうぞ。\n背景の改変はお止め下さい。") == "CONDITIONAL"
    assert stance("シナリオの改変は禁止です。") == "FORBIDDEN"
    assert stance("シナリオの改変は不可です。") == "FORBIDDEN"
    assert stance("・改変は禁止していませんが、遊んだ後に明かすように") == "ALLOWED"
    # Redistributing an altered copy is a different rule.
    assert stance("○改変データの配布") is None


def test_content_warnings():
    v = vals("▍注意事項\n●本作には以下の表現が含まれています\n・グロテスクな表現\n・自殺の描写\n・PCvsPCの対立の可能性\n\n▍添付物\n・本文PDF", "CONTENT_WARNING")
    assert v[0]["tags"] == ["GORE", "SUICIDE_SELF_HARM", "PVP"]
    assert vals("注:R-15G程度の表現あり。", "CONTENT_WARNING")[0]["tags"] == ["GORE"]
    assert vals("R18シナリオじゃありません", "CONTENT_WARNING") == []
    assert vals("■注意事項\nPUBLISHED BY KADOKAWA CORPORATION", "CONTENT_WARNING") == []


def test_round1_skill_forms():
    skills = lambda t: [(v["level"], v["skills"], v["none"]) for v in vals(t, "SKILL")]
    assert skills("推奨技能：基本探索技能\n場合によっては使うかも：医学、戦闘技能") == [
        ("RECOMMENDED", ["基本探索技能"], False), ("SEMI", ["医学", "戦闘技能"], False)]
    assert skills("▶ 推奨技能：目星・聞き耳\n▶ 準 推奨：天文学（代用可）") == [
        ("RECOMMENDED", ["目星", "聞き耳"], False), ("SEMI", ["天文学"], False)]
    assert skills("非推奨 ：低すぎるSAN値") == [("NOT_RECOMMENDED", ["低SAN値"], False)]
    assert skills("推奨技能 図書館、目星、\nオカルト、化学、\nを振る機会があるがいずれも必須ではない。")[0][1] == ["図書館", "目星", "オカルト", "化学"]
    assert skills("●推奨技能：\n〈目星〉〈聞き耳〉〈戦闘系技能〉") == [("RECOMMENDED", ["目星", "聞き耳", "戦闘系技能"], False)]
    assert skills("●準推奨技能(誰か持っていると良い)：ある程度のDEXor投擲") == [("SEMI", ["ある程度のDEX", "投擲"], False)]
    assert skills("推奨技能：なし\n使える技能：目星、聞き耳") == [("SEMI", ["目星", "聞き耳"], False)]
    assert skills("2022/8/2 アップデート版に推奨技能を追記しました。") == []


def test_unlabelled_lost_possibility():
    assert vals("推奨技能：基本探索技能\nロスト可能性あり", "LOSS")[0]["flags"] == ["POSSIBLE"]
    assert vals("ロスト：出目が悪いと戦闘で死ぬかもしれない", "LOSS")[0]["flags"] == ["POSSIBLE"]


def test_element_lists_keep_every_element():
    v = vals("これらの要素を含む\nタイマン ／ シティ ／ 神話生物独自解釈\nうちよそ ／ エモ ／ 記憶喪失 ／ 理不尽展開", "CONTENT_WARNING")[0]
    assert v["items"] == ["タイマン", "シティ", "神話生物独自解釈", "うちよそ", "エモ", "記憶喪失", "理不尽展開"]
    v = vals("■注意事項\n単純なシナリオではありません。\n以下の要素を含むため、引き返すことを推奨します。\n"
             "触手/グロテスクな描写・展開/医療的倫理\n\nまた、どうしても避けられない残酷な選択があるため、KPと相談した上で通過するかどうか決定してください。", "CONTENT_WARNING")[0]
    assert v["items"] == ["触手", "グロテスクな描写・展開", "医療的倫理"]
    assert vals("▼注意\n軽度のグロ描写が含まれます。\n\n▼内容\n・全文テキストファイル", "CONTENT_WARNING")[0]["items"] == ["軽度のグロ描写"]


def test_difficulty_stands_in_for_lost_rate():
    assert vals("推奨技能：元気な心\n難易度 ：低", "LOSS")[0]["level"] == "LOW"
    assert vals("難易度：低\nロスト率：高", "LOSS")[0]["level"] == "HIGH"
    assert vals("KP難易度：高", "LOSS") == []
    assert vals("難易度：不明", "LOSS") == []
