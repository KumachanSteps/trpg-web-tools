from booth_scenario import rules


def modes(text):
    return [h.value for h in rules.extract_session_modes(text)]


def test_1pl_without_companion_is_unspecified_not_solo():
    assert modes("推奨人数：1PL")[0]["mode"] == "ONE_PLAYER_UNSPECIFIED"


def test_1pl_with_kpc_is_one_on_one():
    m = modes("人数：1PL（KPC同行）")[0]
    assert m["mode"] == "ONE_ON_ONE" and m["companion_role"] == "KPC"


def test_explicit_modes():
    assert modes("ソロシナリオです")[0]["mode"] == "SOLO"
    assert modes("KPとPLのタイマンシナリオ")[0]["mode"] == "ONE_ON_ONE"
    assert modes("KPレスで遊べます")[0]["mode"] == "GMLESS_SOLO"


def test_multiple_supported_configurations():
    got = modes("プレイ人数：2～4人\n1PL（DPC）でも遊べます")
    assert {"mode": "MULTI_PL", "player_min": 2, "player_max": 4} .items() <= got[0].items()
    assert got[1]["mode"] == "ONE_ON_ONE" and got[1]["companion_role"] == "DPC"


def test_fullwidth_digits():
    m = modes("ＰＬ：３〜５人")[0]
    assert (m["player_min"], m["player_max"]) == (3, 5)


def test_durations_split_by_medium_and_scope():
    d = [h.value for h in rules.extract_durations("プレイ時間：ボイセ3～4時間／テキセ8時間\n導入：約30分")]
    assert {"mode": "VOICE", "min_minutes": 180, "max_minutes": 240}.items() <= d[0].items()
    assert {"mode": "TEXT", "min_minutes": 480}.items() <= d[1].items()
    assert d[2]["scope"] == "INTRO" and d[2]["min_minutes"] == 30 and d[2]["approximate"] == 1


def test_bgm_unknown_vs_absent():
    assert rules.extract_assets("NPC立ち絵あり") and not [h for h in rules.extract_assets("NPC立ち絵あり") if h.value["asset_type"].startswith("BGM")]
    hit = rules.extract_assets("BGM：なし")[0]
    assert hit.value == {"asset_type": "BGM_AUDIO", "availability_relation": "EXPLICITLY_ABSENT"}


def test_npc_image_explicitly_absent():
    assert rules.extract_assets("NPC立ち絵なし")[0].value == {"asset_type": "NPC_IMAGE", "availability_relation": "EXPLICITLY_ABSENT"}


def test_systems_native_supported_convertible():
    s = {(h.value["system_code"], h.value["support_type"]) for h in rules.extract_systems(
        "システム：新クトゥルフ神話TRPG\n6版にも対応しています\nエモクロアへの変換も可能です")}
    assert s == {("COC7", "NATIVE"), ("COC6", "SUPPORTED"), ("EMOKLORE", "CONVERTIBLE")}


def test_unlabeled_system_mention_is_not_support():
    assert rules.extract_systems("エモクロアの別シナリオもよろしく") == []


def test_edition_kind():
    assert rules.classify_edition_kind("お試し版PDF") == "SAMPLE"
    assert rules.classify_edition_kind("シナリオ本編PDF") == "FULL"
    assert rules.classify_edition_kind("立ち絵素材") == "ASSET_ONLY"
    assert rules.classify_edition_kind("A") == "UNKNOWN"


def test_evidence_kept():
    h = rules.extract_session_modes("■推奨人数：1PL")[0]
    assert "1PL" in h.excerpt


def test_prolonged_sound_mark_is_kept():
    assert modes("プレイヤー：2人")[0]["player_min"] == 2
    assert modes("ソロジャーナル形式")[0]["mode"] == "GMLESS_SOLO"
    d = rules.extract_durations("ボイセ3ー4時間")[0].value
    assert (d["min_minutes"], d["max_minutes"]) == (180, 240)


def test_asset_relation_per_clause():
    got = {h.value["asset_type"]: h.value["availability_relation"] for h in rules.extract_assets("BGMなし、立ち絵あり")}
    assert got == {"BGM_AUDIO": "EXPLICITLY_ABSENT", "NPC_IMAGE": "INCLUDED"}
    got = {h.value["asset_type"]: h.value["availability_relation"] for h in rules.extract_assets("立ち絵 スチル あり")}
    assert got == {"NPC_IMAGE": "INCLUDED", "STILL_IMAGE": "INCLUDED"}
