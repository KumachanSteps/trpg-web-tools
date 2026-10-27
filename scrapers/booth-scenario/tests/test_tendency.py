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
    assert stance("・改変は禁止していませんが、遊んだ後に明かすように") == "ALLOWED"
    # Redistributing an altered copy is a different rule.
    assert stance("○改変データの配布") is None


def test_content_warnings():
    v = vals("▍注意事項\n●本作には以下の表現が含まれています\n・グロテスクな表現\n・自殺の描写\n・PCvsPCの対立の可能性\n\n▍添付物\n・本文PDF", "CONTENT_WARNING")
    assert v[0]["tags"] == ["GORE", "SUICIDE_SELF_HARM", "PVP"]
    assert vals("注:R-15G程度の表現あり。", "CONTENT_WARNING")[0]["tags"] == ["GORE"]
    assert vals("R18シナリオじゃありません", "CONTENT_WARNING") == []
    assert vals("■注意事項\nPUBLISHED BY KADOKAWA CORPORATION", "CONTENT_WARNING") == []
