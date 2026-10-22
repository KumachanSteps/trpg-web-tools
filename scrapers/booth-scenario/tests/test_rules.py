from booth_scenario import rules


def modes(text):
    return [h.value for h in rules.extract_session_modes(text)]


def test_1pl_without_companion_is_solo():
    assert modes("推奨人数：1PL")[0]["mode"] == "SOLO"


def test_default_roles_follow_system_and_taiman():
    # Reviewer convention: KP (CoC) / DL (Emoklore); タイマン plays with a KPC/DPC,
    # anything else has no companion unless the text names one.
    coc, emo = {"COC6"}, {"EMOKLORE"}
    multi = rules.default_roles(modes("PL：2人")[0], coc)
    assert (multi["facilitator_role"], multi["companion_role"]) == ("KP", "NONE")
    taiman = rules.default_roles(modes("タイマンシナリオ")[0], emo)
    assert (taiman["facilitator_role"], taiman["companion_role"]) == ("DL", "DPC")
    gmless = rules.default_roles(modes("DLレス版")[0], emo)
    assert (gmless["facilitator_role"], gmless["companion_role"]) == ("NONE", "NONE")


def test_fixed_counts_and_alternatives():
    assert (modes("□人数 : 新規4人固定")[0]["mode"], modes("・探索者数:4名固定")[0]["player_min"]) == ("MULTI_PL", 4)
    assert [m["mode"] for m in modes("人数:2PLまたはタイマン")] == ["ONE_ON_ONE", "MULTI_PL"]
    assert [m["mode"] for m in modes("人 数:2PLKPレス or タイマン")] == ["GMLESS_MULTI", "ONE_ON_ONE"]
    m = modes("PLとDLが一対一で会話する")[0]
    assert (m["mode"], m["facilitator_role"]) == ("ONE_ON_ONE", "DL")


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


def durs(text):
    return [(h.value["mode"], h.value["scope"], h.value["min_minutes"], h.value["max_minutes"]) for h in rules.extract_durations(text)]


def test_duration_ranges_and_voice_default():
    # A time that names neither text nor voice counts as a voice session.
    assert durs("■推定プレイ時間 10時間~15時間") == [("VOICE", "UNSPECIFIED", 600, 900)]
    assert durs("・プレイ時間:1時間半~2時間") == [("VOICE", "UNSPECIFIED", 90, 120)]
    assert durs("本編時間 :8時間から12時間") == [("VOICE", "MAIN", 480, 720)]
    assert durs("推定時間:9h~10h") == [("VOICE", "UNSPECIFIED", 540, 600)]
    assert durs("所要時間:テキセ10-12時間程度") == [("TEXT", "UNSPECIFIED", 600, 720)]
    assert durs("・出ると噂の廃神社:1時間30分") == [("VOICE", "UNSPECIFIED", 90, 90)]
    # An open range gets one more hour.
    assert durs("▶プレイ時間:2時間半~") == [("VOICE", "UNSPECIFIED", 150, 210)]
    assert durs("時間:15時間以上") == [("VOICE", "UNSPECIFIED", 900, 960)]


def test_campaign_keeps_the_stated_total():
    text = "●時間:11時間程度\n※ボイスセッション想定\n※全エピソードを遊ぶ場合の時間\n・出ると噂の駐車場:1時間\n・幕間:30分"
    assert durs(text) == [("VOICE", "ALL_EPISODES", 660, 660)]


def test_rights_notice_is_not_a_system():
    text = "システム :新クトゥルフ神話TRPG(7版)\n本作は「株式会社アークライト」及び「株式会社KADOKAWA」が権利を有する『クトゥルフ神話TRPG』の二次創作物です。"
    assert {h.value["system_code"] for h in rules.extract_systems(text)} == {"COC7"}


def test_comma_ranges_and_negated_taiman():
    assert (modes("PL:2、3人")[0]["player_min"], modes("PL:2、3人")[0]["player_max"]) == (2, 3)
    assert durs("プレイ時間:2、3時間") == [("VOICE", "UNSPECIFIED", 120, 180)]
    assert [m["mode"] for m in modes("人数:2~4人(タイマンは推奨しません)")] == ["MULTI_PL"]
    assert modes("※タイマン不可") == []


def test_secret_handouts():
    assert rules.has_secret_handouts("秘匿HOシナリオ")
    assert rules.has_secret_handouts("", "2PL秘匿")
    assert not rules.has_secret_handouts("秘匿HOはありません")
