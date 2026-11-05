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


def test_campaign_total_and_episodes():
    text = "●時間:11時間程度\n※ボイスセッション想定\n※全エピソードを遊ぶ場合の時間\n・出ると噂の駐車場:1時間\n・幕間:30分"
    assert durs(text) == [("VOICE", "ALL_EPISODES", 660, 660), ("VOICE", "UNSPECIFIED", 60, 60), ("VOICE", "UNSPECIFIED", 30, 30)]
    acts = "【推定時間】28~30時間/ボイスセッション\n其ノ零-導入 〈3~4時間〉\n其ノ一-麝香と花畑 〈3~4時間〉\n其ノ二-白檀と幕間 〈4~5時間〉"
    assert durs(acts) == [("VOICE", "ALL_EPISODES", 1680, 1800), ("VOICE", "INTRO", 180, 240),
                          ("VOICE", "EPISODE", 180, 240), ("VOICE", "EPISODE", 240, 300)]


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


def test_player_counts_round2():
    def pl(t):
        return [(m["mode"], m["player_min"], m["player_max"]) for m in modes(t)]
    assert pl("推奨プレイヤー人数:1人から") == [("MULTI_PL", 1, 4)]
    assert pl("人数:1人~捌けるだけ") == [("MULTI_PL", 1, 4)]
    assert pl("プレイヤー人数:3人~4人") == [("MULTI_PL", 3, 4)]
    assert pl("人数:新規四人固定、秘匿HO有り") == [("MULTI_PL", 4, 4)]
    assert pl("人数:固定4人") == [("MULTI_PL", 4, 4)]
    assert pl("●4人PL固定(秘匿HO制)") == [("MULTI_PL", 4, 4)]
    assert pl("GM一名とPL三名で遊ぶシナリオ。") == [("MULTI_PL", 3, 3)]
    assert pl("【人数】\n3 人前後") == [("MULTI_PL", 2, 4)]
    assert pl("【人数】1(+KPC) or 2PL") == [("ONE_ON_ONE", 1, 1), ("MULTI_PL", 2, 2)]
    assert pl("推荐人数:2-3人") == []
    assert durs("推定時間:一時間") == [("VOICE", "UNSPECIFIED", 60, 60)]


def test_tagline_time_is_not_play_time():
    assert durs("「昼と夜の隙間、たった1時間のふたりごと」") == []
    assert durs("・出ると噂の駐車場:1時間") == [("VOICE", "UNSPECIFIED", 60, 60)]
    assert durs("・9~10時間") == [("VOICE", "UNSPECIFIED", 540, 600)]
    assert durs("時 間:2~3時間程度") == [("VOICE", "UNSPECIFIED", 120, 180)]


def test_player_counts_round3():
    def pl(t):
        return [(m["mode"], m["player_min"], m["player_max"], m["companion_role"]) for m in modes(t)]
    assert pl("プレイ人数...4名") == [("MULTI_PL", 4, 4, "UNKNOWN")]
    assert pl("プレイ人数:1~(KPが管理可能な人数)+KP側の探索者") == [("MULTI_PL", 1, 4, "KPC")]
    assert pl("人数:1PL\nKPCの手料理を朝から晩まで一緒に食べよう") == [("ONE_ON_ONE", 1, 1, "KPC")]
    assert pl("X2Uをタイマンでまわしちゃだめ?\nPL2人用に作られているのでタイマンは想定していないのですが") == [("MULTI_PL", 2, 2, "UNKNOWN")]
    assert pl("●所要時間:10時間程度(実際に回した際にはPL3人で15時間程度かかりました)") == []
    assert pl("1PL発言で共有する") == []
    assert [h.value["mode"] for h in rules.session_modes_from_title("[CoCソロシナリオ]花冷えの失彩")] == ["SOLO"]


def test_secret_needs_more_than_one_player():
    assert rules.has_secret_handouts("【HO1 真理への背教】\n【HO2 陰背負う英雄】")
    assert not rules.has_secret_handouts("【HO1 共通】")


def test_count_inside_time_line_and_kpc_or_npc_aside():
    assert [(m["player_min"], m["player_max"]) for m in modes("・備考、プレイ時間：1～2時間（プレイ人数：1～4人）")] == [(1, 4)]
    assert modes("PL3人でプレイ時間4時間でした") == []
    m = modes("推奨人数：1PL\nプレイ時間：3～4時間（※KPCかNPCかで多少前後する可能性あり）")
    assert [x["mode"] for x in m] == ["SOLO"]


def test_labelled_count_on_time_line_and_denied_secret():
    assert [(m["player_min"], m["player_max"]) for m in modes("PL：4名／プレイ時間：3時間")] == [(4, 4)]
    assert not rules.has_secret_handouts("秘匿HOなし。\nHO1：刑事\nHO2：探偵")
    assert rules.has_secret_handouts("HO1：刑事\nHO2：探偵")


def test_player_counts_test_batch_1():
    # From the first test batch (20261027-2251): the facilitator is not a player.
    modes = lambda t: sorted((h.value["mode"], h.value["player_min"], h.value["player_max"])  # noqa: E731
                             for h in rules.extract_session_modes(rules.normalize(t)))
    assert modes("プレイ人数：6人（プレイヤー5人＋GM1人）") == [("MULTI_PL", 5, 5)]
    assert modes("【人数】GM1名＋4名") == [("MULTI_PL", 4, 4)]
    assert modes("参加人数：2人（DL1人とPL1人）\nDPCロゴ（png）×2") == [("ONE_ON_ONE", 1, 1)]
    assert modes("人数：KP側PC+PC1名、またはPL2名") == [("MULTI_PL", 2, 2), ("ONE_ON_ONE", 1, 1)]
    assert modes("・人数:PL2人(KPC、DPC改変可)") == [("MULTI_PL", 2, 2), ("ONE_ON_ONE", 1, 1)]
    assert modes("人数：４人（GMレス不可）") == [("MULTI_PL", 4, 4)]
    assert modes("◆人数\n4人（GMなし）or 5人（GM+PL4人）") == [("GMLESS_MULTI", 4, 4), ("MULTI_PL", 4, 4)]


def test_hz_is_not_hours():
    assert rules.extract_durations(rules.normalize("● 52Hzのくじら")) == []


def test_test_batch_2():
    # From the second test batch (20261029-2132).
    modes = lambda t: sorted((h.value["mode"], h.value["player_min"], h.value["player_max"])  # noqa: E731
                             for h in rules.extract_session_modes(rules.normalize(t)))
    assert modes("プレイ人数は、6人用（ＧＭ1人、PL5人）") == [("MULTI_PL", 5, 5)]
    assert modes("・プレイ人数：GM(1名)+プレイヤー(4名)※GMレスも可") == [("GMLESS_MULTI", 4, 4), ("MULTI_PL", 4, 4)]
    assert modes("人数：プレイヤー4人+GM1人（パッケージ版はGM不要）") == [("GMLESS_MULTI", 4, 4), ("MULTI_PL", 4, 4)]
    assert modes("7人用シナリオ\nGMレスでもプレイ可能です\n◆人数\n 7人(オンライン時ゲームマスター不要)") == [("GMLESS_MULTI", 7, 7), ("MULTI_PL", 7, 7)]
    assert modes("GMレス\nプレイ人数 5人用") == [("GMLESS_MULTI", 5, 5)]
    assert modes("■推奨人数\n1人固定\n本シナリオはソロシナリオです。KPC(KPの継続探索者など)を用いたタイマンシナリオではありません。") == [("SOLO", 1, 1)]
    assert durs(rules.normalize("◆時間\n 3－4時間程度")) == [("VOICE", "UNSPECIFIED", 180, 240)]
    assert durs(rules.normalize("・時間 60～90分")) == [("VOICE", "UNSPECIFIED", 60, 90)]
    assert durs(rules.normalize("・時間 本編60分程度（読み込み、感想戦含め2時間程度）")) == [("VOICE", "UNSPECIFIED", 60, 120)]
    assert durs(rules.normalize("シナリオ時間：２～４時間×五章構成")) == [("VOICE", "UNSPECIFIED", 600, 1200)]
    codes = lambda t: [h.value["system_code"] for h in rules.extract_systems_meta(t, [])]  # noqa: E731
    assert codes("「虚実をかける」クトゥルフ神話×マーダーミステリー") == ["MADAMIS"]
    assert codes("CoCマダミス「館」") == ["COC6", "MADAMIS"]


def test_storyplaying_and_gaslight():
    codes = lambda t: [h.value["system_code"] for h in rules.extract_systems_meta(t, [])]  # noqa: E731
    assert codes("相手の名前を正しく呼ばないと出られない部屋【ストプレ】") == ["STORYPLAYING"]
    hits = rules.extract_systems(rules.normalize("■システム：クトゥルフ神話TRPG\nガスライトサプリメント使用"))
    assert [(h.value["system_code"], h.value["support_type"]) for h in hits] == [("COC6", "NATIVE"), ("GASLIGHT", "SUPPLEMENT")]
    assert rules.extract_systems(rules.normalize("特殊な形式のガスライトシナリオですのでサプリが無くとも基本ルルブのみで遊べる")) == []


def test_coc_supplements():
    sup = lambda t: rules.extract_supplements(rules.normalize(t))  # noqa: E731
    assert sup("ガスライトサプリメント使用") == ["GASLIGHT"]
    assert sup("サプリ『比叡山炎上』を使用します") == ["HIEIZAN"]
    assert sup("比叡山炎上対応") == ["HIEIZAN"]
    assert sup("『クトゥルフと帝国』準拠") == ["TEIKOKU"]
    assert sup("パルプクトゥルフのルールを使用") == ["PULP"]
    assert sup("クトゥルフ2015対応、カルト・ナウ使用") == ["COC2015", "CULT_NOW"]
    assert sup("サプリ「ドリームランド」「アーカム」使用") == ["DREAMLANDS", "ARKHAM"]
    assert sup("『ミスカトニック』使用") == ["MISKATONIC"]
    # Places and eras alone, and denials, are not supplements.
    assert sup("探索者はアーカムに向かう必要があります") == []
    assert sup("ミスカトニック大学の教授からの依頼") == []
    assert sup("夢幻境を舞台にしたシナリオです") == []
    assert sup("サプリが無くとも基本ルルブのみで遊べる") == []
    hits = rules.extract_systems(rules.normalize("■システム：クトゥルフ神話TRPG\nサプリ『比叡山炎上』を使用"))
    assert [(h.value["system_code"], h.value["support_type"]) for h in hits] == [("COC6", "NATIVE"), ("HIEIZAN", "SUPPLEMENT")]
    assert sup("◆ 使用サプリ ： 基本ルールブック 6 版、マレウス・モンストロルム") == ["MALLEUS"]
    assert sup("サプリメント(マレウス・モンストロルム、キーパーコンパニオン、クトゥルフ・カルト・ナウ)を元にした") == ["CULT_NOW", "MALLEUS", "KEEPER_COMPANION"]
    assert sup("サプリ「キーパーコンパニオン」があると回しやすいが、基本ルールブック6版のみで回せる") == []
    assert sup("使用サプリ：なし") == []
