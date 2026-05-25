window.OCCUPATIONS = [
  {
    id: "butler_pulp",
    name: "執事",
    ruleType: "pulp",
    ruleLabels: ["パルプ"],
    source: "パルプクトゥルフ",
    sourceShort: "パルプクトゥルフ",
    page: "p.x",
    description: "主人や家の管理を支える、知識と社交性を備えた職業サンプル。",
    skills: [
      "応急手当",
      "鑑定もしくは経理",
      "聞き耳",
      "芸術／製作（任意の分野、例：料理、裁縫、理髪）",
      "心理学",
      "目星",
      "ほかの言語",
      "個人的な専門または時代に関連する任意のほかの2つの技能",
    ],
    skillOptions: [],
    pointFormula: "EDU × 4",
    credit: "9～40%（雇い主の地位と＜信用＞で変化する）",
    special: "",
    alliesExample: "ほかの家庭の給仕係、地元のビジネスマン、店員。",
    keywords: ["執事", "使用人", "給仕", "家事"],
    note: "",
  },
];
window.OCCUPATIONS_6E_COC2015 = [
  {
    id: "animal_therapist_2015",
    name: "アニマルセラピスト",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["聞き耳", "心理学", "精神分析", "生物学", "跳躍", "追跡", "博物学"],
    skillOptions: [
      {
        label: "個人的な関心の技能1つ",
        choose: 1,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "動物が懐きやすい。",
    alliesExample: "",
    keywords: ["アニマルセラピスト", "動物", "医療系"],
    note: ""
  },
  {
    id: "nurse_2015",
    name: "看護師",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["科学", "生物学", "応急手当", "薬学", "心理学", "聞き耳", "目星"],
    skillOptions: [
      {
        label: "言いくるめ または 説得",
        choose: 1,
        options: ["言いくるめ", "説得"]
      }
    ],
    pointFormula: "EDU × 20",
    credit: "",
    special: "信用に＋10%のボーナス。患者に対する説得に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["看護師", "医療系"],
    note: ""
  },
  {
    id: "emergency_medical_technician_2015",
    name: "救急救命士",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["医学", "応急手当", "科学", "鍵開け", "機械修理", "電気修理", "登攀"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "人間や自然界の動物の死体を見ても正気度ポイントを失わない。ただし、超自然的な原因で死亡していた場合は通常通り正気度ポイントを失う。",
    alliesExample: "",
    keywords: ["救急救命士", "救命士", "医療系"],
    note: ""
  },
  {
    id: "plastic_surgeon_2015",
    name: "形成外科医",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["医学", "応急手当", "経理", "心理学", "説得", "値切り", "薬学", "ほかの言語（英語）"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "APP＋1。",
    alliesExample: "",
    keywords: ["形成外科医", "外科医", "医療系"],
    note: ""
  },
  {
    id: "surgeon_or_dentist_2015",
    name: "外科医 or 歯科医",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["医学", "応急手当", "経理", "信用", "生物学", "説得", "薬学", "ほかの言語（英語）"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "DEX＋1。",
    alliesExample: "",
    keywords: ["外科医", "歯科医", "医療系"],
    note: ""
  },
  {
    id: "psychiatrist_2015",
    name: "精神科医",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["医学", "科学", "心理学", "精神分析", "生物学", "説得", "薬学", "ほかの言語"],
    skillOptions: [],
    pointFormula: "EDU × 20 または EDU × 10 ＋ APP × 10",
    credit: "",
    special: "1件の狂気において精神分析ロールに失敗しても、環境を整えたり投薬を行うことで、再度精神分析ロールを試みることができる。",
    alliesExample: "",
    keywords: ["精神科医", "医療系", "精神分析"],
    note: ""
  },
  {
    id: "underground_doctor_2015",
    name: "闇医者",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["医学", "応急手当", "経理", "説得", "法律", "薬学", "ほかの言語"],
    skillOptions: [
      {
        label: "個人的な関心の技能1つ",
        choose: 1,
        options: []
      }
    ],
    pointFormula: "EDU × 20 または EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "不十分な器具や設備でも、有り合わせの道具で十分な応急手当を行える。",
    alliesExample: "",
    keywords: ["闇医者", "医療系", "アウトロー"],
    note: ""
  },
  {
    id: "coast_guard_2015",
    name: "海上保安官",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["機械修理", "重機械操作", "信用", "操縦（船舶）", "登攀", "ナビゲート", "法律", "サバイバル（海）"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "目星に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["海上保安官", "警察官", "消防士"],
    note: ""
  },
  {
    id: "forensic_scientist_2015",
    name: "科学捜査研究員",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["医学", "科学", "コンピューター", "写真術", "人類学", "生物学", "法律", "薬学"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "人間や自然界の動物の死体を見ても正気度ポイントを失わない。ただし、超自然的な原因で死亡していた場合は通常通り正気度ポイントを失う。",
    alliesExample: "",
    keywords: ["科学捜査研究員", "科捜研", "警察官", "消防士"],
    note: ""
  },
  {
    id: "mountain_rescue_worker_2015",
    name: "山岳救助隊員",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["応急手当", "聞き耳", "跳躍", "追跡", "登攀", "ナビゲート", "サバイバル（山）", "ほかの言語"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "高所恐怖症でない限り、高所で恐怖を感じることはない。",
    alliesExample: "",
    keywords: ["山岳救助隊員", "救助", "消防士"],
    note: ""
  },
  {
    id: "firefighter_2015",
    name: "消防士",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["運転（自動車）", "応急手当", "回避", "機械修理", "重機械操作", "跳躍", "投擲", "登攀"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "STR＋1またはCON＋1。炎に対する恐怖心を克服している。",
    alliesExample: "",
    keywords: ["消防士", "警察官", "消防士"],
    note: ""
  },
  {
    id: "artist_basic_2015",
    name: "芸術家（基本）",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["心理学", "目星"],
    skillOptions: [
      {
        label: "言いくるめ または 説得",
        choose: 1,
        options: ["言いくるめ", "説得"]
      },
      {
        label: "芸術（任意） または 製作（任意）",
        choose: 1,
        options: ["芸術（任意）", "製作（任意）"]
      },
      {
        label: "歴史 または 博物学",
        choose: 1,
        options: ["歴史", "博物学"]
      },
      {
        label: "次の技能から3つ選択",
        choose: 3,
        options: ["コンピューター", "写真術", "生物学", "天文学", "芸術（任意）", "製作（任意）"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "専門とする分野の芸術または製作技能に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["芸術家", "アーティスト", "芸術系"],
    note: ""
  },
  {
    id: "dancer_2015",
    name: "ダンサー",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["回避", "芸術（ダンス）", "忍び歩き", "跳躍", "登攀", "目星"],
    skillOptions: [
      {
        label: "個人的な関心の技能2つ",
        choose: 2,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "芸術（ダンス）に＋10%のボーナス。回避に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["ダンサー", "芸術系"],
    note: ""
  },
  {
    id: "designer_2015",
    name: "デザイナー",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["コンピューター", "心理学", "図書館", "目星"],
    skillOptions: [
      {
        label: "言いくるめ または 説得",
        choose: 1,
        options: ["言いくるめ", "説得"]
      },
      {
        label: "芸術（任意） または 製作（任意）",
        choose: 1,
        options: ["芸術（任意）", "製作（任意）"]
      },
      {
        label: "個人的な関心の技能2つ",
        choose: 2,
        options: []
      }
    ],
    pointFormula: "EDU × 20 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "流行に敏感。感受性が高く、絵画や彫刻などに込められた暗喩に気づきやすい。",
    alliesExample: "",
    keywords: ["デザイナー", "芸術系"],
    note: ""
  },
  {
    id: "fashion_artist_2015",
    name: "ファッション系芸術家",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["心理学", "値切り", "変装", "目星"],
    skillOptions: [
      {
        label: "言いくるめ または 説得",
        choose: 1,
        options: ["言いくるめ", "説得"]
      },
      {
        label: "芸術（任意） または 製作（任意）",
        choose: 1,
        options: ["芸術（任意）", "製作（任意）"]
      },
      {
        label: "個人的な関心の技能2つ",
        choose: 2,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "流行に敏感。相手の服装を見ただけで、社会的地位や収入などがわかる。さりげないアクセサリーの価値もわかる。",
    alliesExample: "",
    keywords: ["ファッション系芸術家", "ファッション", "芸術系"],
    note: ""
  },
  {
    id: "jsdf_ground_member_2015",
    name: "自衛官（陸上自衛隊員）",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["応急手当", "回避", "隠れる"],
    skillOptions: [
      {
        label: "サバイバル（山 または 砂漠）",
        choose: 1,
        options: ["サバイバル（山）", "サバイバル（砂漠）"]
      },
      {
        label: "任意の近接戦技能",
        choose: 1,
        options: ["こぶし（パンチ）", "キック", "組み付き", "頭突き", "武道（任意）", "日本刀", "ナイフ", "杖"]
      },
      {
        label: "任意の火器技能",
        choose: 1,
        options: ["拳銃", "サブマシンガン", "ショットガン", "マシンガン", "ライフル", "砲"]
      },
      {
        label: "次の技能から2つ選択",
        choose: 2,
        options: ["機械修理", "忍び歩き", "水泳", "登攀", "ほかの言語", "パラシュート", "重機械操作", "砲"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "幹部自衛官（士官）：軍事や戦闘に関する説得に＋10%のボーナス。その他の自衛官（下士官・兵）：STR＋1またはCON＋1。",
    alliesExample: "",
    keywords: ["自衛官", "陸上自衛隊員", "軍事系"],
    note: ""
  },
  {
    id: "jsdf_maritime_member_2015",
    name: "自衛官（海上自衛隊員･艦上勤務）",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["応急手当", "重機械操作", "水泳", "操縦（ボート）", "ナビゲート", "サバイバル（海）"],
    skillOptions: [
      {
        label: "次の技能から2つ選択",
        choose: 2,
        options: ["機械修理", "電気修理", "任意の近接戦技能", "任意の火器技能", "砲"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "幹部自衛官（士官）：軍事や戦闘に関する説得に＋10%のボーナス。その他の自衛官（下士官・兵）：STR＋1またはCON＋1。",
    alliesExample: "",
    keywords: ["自衛官", "海上自衛隊員", "艦上勤務", "軍事系"],
    note: ""
  },
  {
    id: "jsdf_pilot_2015",
    name: "自衛官（自衛隊パイロット･陸海空）",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["機械修理", "重機械操作", "操縦（戦闘機、大型機、ヘリコプターなど）", "電気修理", "天文学", "ナビゲート", "パラシュート"],
    skillOptions: [
      {
        label: "個人的な関心の技能1つ",
        choose: 1,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "幹部自衛官（士官）：軍事や戦闘に関する説得に＋10%のボーナス。その他の自衛官（下士官・兵）：STR＋1またはCON＋1。",
    alliesExample: "",
    keywords: ["自衛官", "自衛隊パイロット", "パイロット", "軍事系"],
    note: ""
  },
  {
    id: "pmc_member_2015",
    name: "民間軍事会社メンバー",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["回避", "隠れる", "忍び歩き"],
    skillOptions: [
      {
        label: "水泳 または 登攀",
        choose: 1,
        options: ["水泳", "登攀"]
      },
      {
        label: "任意の近接戦技能",
        choose: 1,
        options: ["こぶし（パンチ）", "キック", "組み付き", "頭突き", "武道（任意）", "ナイフ"]
      },
      {
        label: "任意の火器技能",
        choose: 1,
        options: ["拳銃", "サブマシンガン", "ショットガン", "マシンガン", "ライフル"]
      },
      {
        label: "次の技能から2つ選択",
        choose: 2,
        options: ["応急手当", "機械修理", "サバイバル（山）", "サバイバル（砂漠）", "ほかの言語"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "人類学に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["民間軍事会社メンバー", "PMC", "軍事系"],
    note: ""
  },
  {
    id: "athlete_dex_2015",
    name: "DEX系アスリート",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["忍び歩き", "回避", "芸術（任意のスポーツ競技）", "跳躍", "投擲", "登攀"],
    skillOptions: [
      {
        label: "次の技能から3つ選択",
        choose: 3,
        options: ["応急手当", "乗馬", "水泳", "こぶし（パンチ）", "キック", "頭突き", "組み付き", "武道（任意）", "日本刀", "薙刀", "杖", "弓", "アーチェリー", "拳銃", "ライフル", "ショットガン"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "CON、STR、SIZ、DEXのいずれかに＋1。EDUに－1。",
    alliesExample: "",
    keywords: ["DEX系アスリート", "アスリート", "運動関係職業"],
    note: "テニス、野球、サッカー、エアロ、ヨガ、スポーツトレーナーなど。"
  },
  {
    id: "athlete_str_2015",
    name: "STR系アスリート",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["回避", "芸術（任意のスポーツ競技）", "跳躍", "投擲", "登攀"],
    skillOptions: [
      {
        label: "次の技能から3つ選択",
        choose: 3,
        options: ["応急手当", "乗馬", "水泳", "こぶし（パンチ）", "キック", "頭突き", "組み付き", "武道（任意）", "日本刀", "薙刀", "杖", "弓", "アーチェリー", "拳銃", "ライフル", "ショットガン"]
      }
    ],
    pointFormula: "EDU × 10 ＋ STR × 10",
    credit: "",
    special: "CON、STR、SIZ、DEXのいずれかに＋1。EDUに－1。",
    alliesExample: "",
    keywords: ["STR系アスリート", "アスリート", "運動関係職業"],
    note: "力士、レスラーなど。"
  },
  {
    id: "athlete_con_2015",
    name: "CON系アスリート",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["回避", "芸術（任意のスポーツ競技）", "跳躍", "投擲", "登攀"],
    skillOptions: [
      {
        label: "次の技能から3つ選択",
        choose: 3,
        options: ["応急手当", "乗馬", "水泳", "こぶし（パンチ）", "キック", "頭突き", "組み付き", "武道（任意）", "日本刀", "薙刀", "杖", "弓", "アーチェリー", "拳銃", "ライフル", "ショットガン"]
      }
    ],
    pointFormula: "EDU × 10 ＋ CON × 10",
    credit: "",
    special: "CON、STR、SIZ、DEXのいずれかに＋1。EDUに－1。",
    alliesExample: "",
    keywords: ["CON系アスリート", "アスリート", "運動関係職業"],
    note: "長距離走選手など。"
  },
  {
    id: "adventurer_professor_2015",
    name: "冒険家教授",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["応急手当", "説得", "跳躍", "登攀", "図書館", "ほかの言語"],
    skillOptions: [
      {
        label: "専門の技能として2つ選択",
        choose: 2,
        options: ["考古学", "地質学", "歴史"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ CON × 10",
    credit: "",
    special: "研究分野における目星に＋20%のボーナス。",
    alliesExample: "",
    keywords: ["冒険家教授", "教授", "知識人", "研究者"],
    note: ""
  },
  {
    id: "critic_2015",
    name: "評論家",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["信用", "心理学", "説得", "図書館", "値切り", "母国語"],
    skillOptions: [
      {
        label: "専門分野として2つ選択",
        choose: 2,
        options: ["オカルト", "博物学", "歴史"]
      }
    ],
    pointFormula: "EDU × 20",
    credit: "",
    special: "専門分野における説得に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["評論家", "知識人", "研究者"],
    note: ""
  },
  {
    id: "idol_music_talent_2015",
    name: "アイドル・音楽タレント",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "芸術（歌唱）", "芸術（ダンス）", "心理学", "説得", "変装"],
    skillOptions: [
      {
        label: "個人的な関心の技能2つ",
        choose: 2,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ APP × 10",
    credit: "",
    special: "ファンに対する説得に＋20%のボーナス。",
    alliesExample: "",
    keywords: ["アイドル", "音楽タレント", "タレント系"],
    note: ""
  },
  {
    id: "announcer_2015",
    name: "アナウンサー",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "信用", "心理学", "説得", "芸術（アナウンス）", "図書館", "母国語"],
    skillOptions: [
      {
        label: "個人的な関心の技能1つ",
        choose: 1,
        options: []
      }
    ],
    pointFormula: "EDU × 20 または EDU × 10 ＋ APP × 10",
    credit: "",
    special: "本心を隠すのが上手い。相手の心理学に－10%のペナルティー。",
    alliesExample: "",
    keywords: ["アナウンサー", "タレント系"],
    note: ""
  },
  {
    id: "comedian_2015",
    name: "コメディアン",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "聞き耳", "心理学", "芸術（物語）", "芸術（演劇）", "変装"],
    skillOptions: [
      {
        label: "個人的な関心の技能2つ",
        choose: 2,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "言いくるめに＋10%のボーナス。",
    alliesExample: "",
    keywords: ["コメディアン", "タレント系"],
    note: ""
  },
  {
    id: "sports_talent_2015",
    name: "スポーツタレント",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "心理学", "芸術（演劇）", "変装"],
    skillOptions: [
      {
        label: "跳躍 または 登攀",
        choose: 1,
        options: ["跳躍", "登攀"]
      },
      {
        label: "任意の素手の近接戦技能",
        choose: 1,
        options: ["こぶし（パンチ）", "キック", "組み付き", "頭突き"]
      },
      {
        label: "個人的な関心の技能2つ",
        choose: 2,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ CON × 10 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "CON＋1 または 回避に＋10%のボーナス。EDUに－1。",
    alliesExample: "",
    keywords: ["スポーツタレント", "タレント系"],
    note: ""
  },
  {
    id: "commentator_2015",
    name: "コメンテーター",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "聞き耳", "信用", "心理学", "説得", "図書館", "値切り"],
    skillOptions: [
      {
        label: "個人的な専門の技能1つ",
        choose: 1,
        options: []
      }
    ],
    pointFormula: "EDU × 20 または EDU × 10 ＋ APP × 10",
    credit: "",
    special: "本心を隠すのが上手い。相手の心理学に－10%のペナルティー。",
    alliesExample: "",
    keywords: ["コメンテーター", "テレビ", "ラジオ", "Web", "イベント", "タレント系"],
    note: ""
  },
  {
    id: "internet_talent_2015",
    name: "ネットタレント",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["コンピューター", "心理学", "説得", "電気修理"],
    skillOptions: [
      {
        label: "芸術（歌唱、演劇、ダンス、楽器演奏など）",
        choose: 1,
        options: ["芸術（歌唱）", "芸術（演劇）", "芸術（ダンス）", "芸術（楽器演奏）"]
      },
      {
        label: "個人的な関心の技能3つ",
        choose: 3,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "APP＋1 または CON＋1。ネット上のうわさ話に関する図書館に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["ネットタレント", "実況者", "歌い手", "踊り手", "ボカロP", "タレント系"],
    note: ""
  },
  {
    id: "actor_2015",
    name: "俳優",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "運転（自動車）", "芸術（演劇）", "心理学", "説得", "変装"],
    skillOptions: [
      {
        label: "個人的な関心の技能2つ",
        choose: 2,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ APP × 10",
    credit: "",
    special: "APP＋1。ファンに対する信用に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["俳優", "タレント系"],
    note: ""
  },
  {
    id: "producer_manager_2015",
    name: "プロデューサー・マネージャー",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "運転（自動車）", "隠れる", "聞き耳", "忍び歩き", "値切り", "法律"],
    skillOptions: [
      {
        label: "個人的な関心の技能1つ",
        choose: 1,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ POW × 10",
    credit: "",
    special: "テレビ局にコネを持っており、自由に出入りできる。うまくすれば、有名人にも近づける。",
    alliesExample: "",
    keywords: ["プロデューサー", "マネージャー", "タレント系"],
    note: ""
  },
  {
    id: "ghost_hunter_2015",
    name: "ゴーストハンター",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["オカルト", "科学", "機械修理", "写真術", "生物学", "説得", "電気修理", "物理学"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "超常現象に関する目星に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["ゴーストハンター", "超心理学者", "霊感系"],
    note: ""
  },
  {
    id: "fortune_teller_spiritualist_medium_2015",
    name: "占い師・スピリチュアリスト・霊媒師",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "オカルト", "芸術（演劇）", "信用", "心理学", "説得", "値切り"],
    skillOptions: [
      {
        label: "個人的な関心の技能1つ",
        choose: 1,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "オカルトを信じている人に対する言いくるめや説得に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["占い師", "スピリチュアリスト", "霊媒師", "超心理学者", "霊感系"],
    note: ""
  },
  {
    id: "butler_maid_2015",
    name: "執事・メイド",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["応急手当", "聞き耳", "経理", "心理学", "目星", "ほかの言語"],
    skillOptions: [
      {
        label: "言いくるめ または 説得",
        choose: 1,
        options: ["言いくるめ", "説得"]
      },
      {
        label: "芸術 または 製作（ワイン鑑定、料理、裁縫、掃除など）",
        choose: 1,
        options: ["芸術（ワイン鑑定）", "製作（料理）", "製作（裁縫）", "製作（掃除）"]
      }
    ],
    pointFormula: "EDU × 20",
    credit: "",
    special: "主人のそばに控えていれば、主人の言いくるめと信用に＋10%のボーナスを与える。",
    alliesExample: "",
    keywords: ["執事", "メイド", "ビジネス", "労働系"],
    note: ""
  },
  {
    id: "salesperson_2015",
    name: "セールスマン",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "運転（自動車）", "芸術（演技）", "経理", "心理学", "説得", "値切り"],
    skillOptions: [
      {
        label: "個人的な関心の技能1つ",
        choose: 1,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "自分の商材に関する言いくるめと説得に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["セールスマン", "営業", "ビジネス", "労働系"],
    note: ""
  },
  {
    id: "customer_service_worker_2015",
    name: "対面接客業",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "回避", "聞き耳", "経理", "心理学", "説得", "値切り", "目星"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "勤務時など完璧な身だしなみを整えている際はAPP＋2の補正が入る（技能ポイントは増えない）。",
    alliesExample: "",
    keywords: ["対面接客業", "ホスト", "ホステス", "ウェイター", "ウェイトレス", "コンシェルジュ", "テーマパークスタッフ", "ビジネス", "労働系"],
    note: ""
  },
  {
    id: "mechanic_2015",
    name: "メカニック",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["登攀", "運転（自動車）", "電気修理", "機械修理", "重機械操作"],
    skillOptions: [
      {
        label: "芸術 または 製作（大工、溶接、配管など）",
        choose: 1,
        options: ["芸術（任意）", "製作（大工）", "製作（溶接）", "製作（配管）"]
      },
      {
        label: "個人的な関心の技能2つ",
        choose: 2,
        options: []
      }
    ],
    pointFormula: "EDU × 20",
    credit: "",
    special: "自分の専門分野の構造物や製品であれば、一通り見れば、その構造や不自然な点に気付くことができる。",
    alliesExample: "",
    keywords: ["メカニック", "大工", "石工", "配管工", "電気工", "機械工", "機械修理工", "ビジネス", "労働系"],
    note: ""
  },
  {
    id: "cook_2015",
    name: "料理人",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["科学", "生物学", "博物学", "目星", "ほかの言語", "歴史（特に料理関係）"],
    skillOptions: [
      {
        label: "芸術 または 製作（料理）",
        choose: 1,
        options: ["芸術（料理）", "製作（料理）"]
      },
      {
        label: "次の技能から1つ選択",
        choose: 1,
        options: ["肉切り包丁", "小型ナイフ", "小さい棍棒"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "専門のサービスを提供し、かつ芸術または製作（料理）に成功すれば、信用や説得などに＋10%のボーナス。",
    alliesExample: "",
    keywords: ["料理人", "コック", "板前", "パティシエ", "ショコラティエ", "ソムリエ", "ビジネス", "労働系"],
    note: ""
  },
  {
    id: "gambler_2015",
    name: "ギャンブラー",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "隠す", "聞き耳", "芸術（演劇）", "経理", "心理学", "目星"],
    skillOptions: [
      {
        label: "個人的な関心の技能1つ",
        choose: 1,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "ギャンブルの際、幸運に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["ギャンブラー", "アウトロー系"],
    note: ""
  },
  {
    id: "financial_criminal_2015",
    name: "経済犯罪者",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "経理", "コンピューター", "信用", "心理学", "説得", "値切り", "法律"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "年収が＋50%アップ。",
    alliesExample: "",
    keywords: ["経済犯罪者", "アウトロー系"],
    note: ""
  },
  {
    id: "street_rogue_2015",
    name: "ストリート・ローグ",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "隠れる", "心理学", "目星"],
    skillOptions: [
      {
        label: "次の技能から4つ選択",
        choose: 4,
        options: ["芸術（ダンス）", "芸術（ファッション）", "跳躍", "投擲", "登攀", "変装", "任意の素手の戦闘技能", "ナイフ"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "地元の道や地元の裏のルールに精通している。",
    alliesExample: "",
    keywords: ["ストリート・ローグ", "不良", "チーマー", "カラーギャング", "フラッパー", "ギャル", "アウトロー系"],
    note: ""
  },
  {
    id: "cyber_criminal_2015",
    name: "ネット犯罪者",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["コンピューター", "心理学", "芸術（ハッキング）", "製作（コンピューターウイルス）", "図書館", "法律"],
    skillOptions: [
      {
        label: "個人的な関心の技能2つ",
        choose: 2,
        options: []
      }
    ],
    pointFormula: "EDU × 20",
    credit: "",
    special: "CON－1。ネット上のうわさ話に関する図書館と製作（コンピューターウイルス）に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["ネット犯罪者", "ハッカー", "クラッカー", "アウトロー系"],
    note: ""
  },
  {
    id: "bodyguard_hitman_2015",
    name: "用心棒",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["鍵開け", "隠れる", "忍び歩き", "心理学", "追跡", "変装"],
    skillOptions: [
      {
        label: "任意の近接戦技能",
        choose: 1,
        options: ["こぶし（パンチ）", "キック", "組み付き", "頭突き", "武道（任意）", "ナイフ", "日本刀", "杖"]
      },
      {
        label: "任意の火器技能",
        choose: 1,
        options: ["拳銃", "サブマシンガン", "ショットガン", "マシンガン", "ライフル"]
      }
    ],
    pointFormula: "EDU × 10 ＋ STR × 10 または EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "人間や自然界の動物の死体を見ても正気度ポイントを失わない。ただし、超自然的な原因で死亡していた場合は通常通り正気度ポイントを失う。",
    alliesExample: "",
    keywords: ["用心棒", "ヒットマン", "アウトロー系"],
    note: ""
  },
  {
    id: "cultist_2015",
    name: "狂信者",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: [],
    skillOptions: [],
    pointFormula: "",
    credit: "",
    special: "",
    alliesExample: "",
    keywords: ["狂信者", "その他の職業"],
    note: "宇宙的恐怖に関わる存在を信仰する探索者の敵となる人間のこと。基本非推奨。詳細はクトゥルフ神話TRPG2015 p.58～p.62を参照。"
  },
  {
    id: "elected_official_2015",
    name: "公選職",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "聞き耳", "芸術（握手）", "心理学", "説得", "法律", "歴史", "母国語"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ APP × 10",
    credit: "",
    special: "信用に＋10%のボーナス。自分の選挙区であれば信用にさらに＋10%のボーナス。",
    alliesExample: "",
    keywords: ["公選職", "政治家", "議員", "その他の職業"],
    note: "都道府県や市区町村の長や議員、国会議員など。"
  },
  {
    id: "human_mountain_2015",
    name: "人間山脈",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["投擲", "武道"],
    skillOptions: [
      {
        label: "素手の近接戦技能2つ",
        choose: 2,
        options: ["こぶし（パンチ）", "キック", "組み付き", "頭突き"]
      },
      {
        label: "個人的な関心の技能3つ",
        choose: 3,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ SIZ × 10",
    credit: "",
    special: "SIZ＋1。回避、隠れる、忍び歩きに－20%のペナルティー。",
    alliesExample: "",
    keywords: ["人間山脈", "ボディガード", "SP", "付き人", "黒服", "その他の職業"],
    note: ""
  },
  {
    id: "game_tester_2015",
    name: "テストプレイヤー",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "聞き耳", "芸術（ゲーム）", "コンピューター", "電気修理", "値切り"],
    skillOptions: [
      {
        label: "個人的な関心の技能2つ",
        choose: 2,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "仕事で携わったゲームのファンに対して言いくるめと信用に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["テストプレイヤー", "ゲーム", "デバッカー", "その他の職業"],
    note: ""
  },
  {
    id: "video_journalist_2015",
    name: "ビデオジャーナリスト",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "隠す", "写真術", "電気修理", "法律"],
    skillOptions: [
      {
        label: "次の技能から2つ選択",
        choose: 2,
        options: ["運転（自動車）", "隠れる", "ナビゲート"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "自分のビデオの視聴者に対する言いくるめと心理学に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["ビデオジャーナリスト", "ジャーナリスト", "動画", "その他の職業"],
    note: ""
  },
  {
    id: "doctor_updated_2015",
    name: "医師",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["医学", "応急手当", "経理", "信用", "生物学", "説得", "薬学", "ほかの言語（英語、ラテン語、ドイツ語）"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "信用に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["医師", "2010変更", "医療系"],
    note: ""
  },
  {
    id: "engineer_updated_2015",
    name: "エンジニア",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["機械修理", "コンピューター", "重機械操作", "電気修理", "図書館", "物理学", "ほかの言語（英語）"],
    skillOptions: [
      {
        label: "次の技能から1つ選択",
        choose: 1,
        options: ["科学", "地質学", "電子工学"]
      }
    ],
    pointFormula: "EDU × 20",
    credit: "",
    special: "自分の専門分野の構造物や製品であれば、歴史上の古いものでも構造や異物や図面などから、その構造や設計思想を理解することができる。",
    alliesExample: "",
    keywords: ["エンジニア", "技術者", "2010変更"],
    note: ""
  },
  {
    id: "police_detective_updated_2015",
    name: "警官、刑事",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["言いくるめ", "聞き耳", "心理学", "説得", "追跡", "法律", "目星"],
    skillOptions: [
      {
        label: "次の技能から1つ選択",
        choose: 1,
        options: ["運転（自動車）", "運転（二輪車）", "信用", "組み付き", "武道（柔道）", "日本刀", "拳銃", "杖"]
      }
    ],
    pointFormula: "EDU × 20 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "制服を着ているか、警察手帳を提示すれば、信用に＋20%のボーナス。ただし、何らかの理由で警察に敵意を抱いている者に対しては適用されない。",
    alliesExample: "",
    keywords: ["警官", "刑事", "警察", "2010変更"],
    note: ""
  },
  {
    id: "antiquarian_updated_2015",
    name: "古物研究家",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["芸術（任意）", "コンピューター", "製作（古書修復、古美術修復など）", "図書館", "値切り", "ほかの言語（英語、漢文、ラテン語など）", "目星", "歴史"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "古物に関する言いくるめと説得に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["古物研究家", "古書", "古美術", "2010変更"],
    note: ""
  },
  {
    id: "computer_technician_updated_2015",
    name: "コンピューター技術者",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["言いくるめ", "経理", "コンピューター", "電気修理", "電子工学", "図書館", "物理学", "ほかの言語（英語、その他）"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "コンピューターに＋10%のボーナス。",
    alliesExample: "",
    keywords: ["コンピューター技術者", "技術者", "2010変更"],
    note: ""
  },
  {
    id: "writer_updated_2015",
    name: "作家",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["オカルト", "芸術（トリビア知識、詩的表現など）", "心理学", "説得", "図書館", "ほかの言語（英語など）", "母国語", "歴史"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "作品の得意分野（歴史、SF、法廷、心理サスペンスなど）としている技能に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["作家", "2010変更"],
    note: ""
  },
  {
    id: "journalist_updated_2015",
    name: "ジャーナリスト",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "写真術", "心理学", "説得", "図書館", "母国語", "ほかの言語（英語など）", "歴史"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "真実が隠蔽された報道を目ざとく見分けることができる。",
    alliesExample: "",
    keywords: ["ジャーナリスト", "記者", "2010変更"],
    note: ""
  },
  {
    id: "religious_worker_updated_2015",
    name: "宗教家",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["オカルト", "聞き耳", "経理", "心理学", "説得", "図書館", "歴史"],
    skillOptions: [
      {
        label: "次の技能から1つ選択",
        choose: 1,
        options: ["言いくるめ", "信用", "ほかの言語（漢文、梵語、ラテン語など）"]
      }
    ],
    pointFormula: "EDU × 20",
    credit: "",
    special: "支援者に対する信用に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["宗教家", "2010変更"],
    note: ""
  },
  {
    id: "shopkeeper_clerk_updated_2015",
    name: "商店主、店員",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["言いくるめ", "聞き耳", "経理", "心理学", "信用", "値切り"],
    skillOptions: [
      {
        label: "次の技能から1つ選択",
        choose: 1,
        options: ["運転（自動車）", "運転（二輪車）", "コンピューター"]
      },
      {
        label: "商品知識として好きな技能を1つ",
        choose: 1,
        options: []
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ APP × 10",
    credit: "",
    special: "交渉の際、相手の言いくるめと値切りに－10%のペナルティー。",
    alliesExample: "",
    keywords: ["商店主", "店員", "2010変更"],
    note: ""
  },
  {
    id: "private_detective_updated_2015",
    name: "私立探偵",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["言いくるめ", "鍵開け", "心理学", "追跡", "図書館", "法律", "目星"],
    skillOptions: [
      {
        label: "次の技能から1つ選択",
        choose: 1,
        options: ["聞き耳", "写真術", "値切り", "こぶし（パンチ）"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "隠密行動が得意。隠れるに＋10%のボーナス。",
    alliesExample: "",
    keywords: ["私立探偵", "探偵", "2010変更"],
    note: ""
  },
  {
    id: "fisheries_worker_updated_2015",
    name: "水産業従事者",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["機械修理", "重機械操作", "水泳", "操縦（船舶）", "天文学", "ナビゲート", "博物学", "目星"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "CON＋1。",
    alliesExample: "",
    keywords: ["水産業従事者", "漁師", "2010変更"],
    note: ""
  },
  {
    id: "university_professor_updated_2015",
    name: "大学教授",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["信用", "心理学", "説得", "図書館", "値切り", "ほかの言語（英語など）"],
    skillOptions: [
      {
        label: "専門的研究分野として2つ選択",
        choose: 2,
        options: ["医学", "化学", "考古学", "人類学", "生物学", "地質学", "電子工学", "天文学", "博物学", "物理学", "法律", "歴史"]
      }
    ],
    pointFormula: "EDU × 20",
    credit: "",
    special: "信用に＋10%のボーナス。大学の関係者に対しては信用に＋20%のボーナス。",
    alliesExample: "",
    keywords: ["大学教授", "教授", "2010変更"],
    note: ""
  },
  {
    id: "talent_updated_2015",
    name: "タレント",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.5-14",
    description: "",
    skills: ["言いくるめ", "聞き耳", "信用", "心理学", "説得", "芸術（楽器演奏、歌唱、ダンス、演技、司会など）", "変装", "ほかの言語"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "ファンに対して説得に＋20%のボーナス。テレビ局の人間にコネがある。芸能人との交流が広い。",
    alliesExample: "",
    keywords: ["タレント", "2010変更"],
    note: "タレント系職業の項も参照。"
  },
  {
    id: "parapsychologist_updated_2015",
    name: "超心理学者",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["オカルト", "人類学", "写真術", "心理学", "精神分析", "図書館", "ほかの言語（英語、ラテン語など）", "歴史"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "オカルトを信じている人に対する言いくるめや説得に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["超心理学者", "2010変更"],
    note: ""
  },
  {
    id: "dilettante_updated_2015",
    name: "ディレッタント",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["運転（自動車）", "芸術（音楽、美術、文学、ダンス、スポーツなど）", "信用", "図書館", "法律", "ほかの言語（英語など）"],
    skillOptions: [
      {
        label: "次の技能から2つ選択",
        choose: 2,
        options: ["乗馬", "写真術", "操縦（航空機）", "操縦（船舶）", "拳銃", "ライフル", "ショットガン", "武道（任意）"]
      }
    ],
    pointFormula: "EDU × 20 または EDU × 10 ＋ APP × 10",
    credit: "",
    special: "信用に＋10%のボーナス。地元のさまざまな同好会やクラブの会員であり、コネがある。",
    alliesExample: "",
    keywords: ["ディレッタント", "2010変更"],
    note: ""
  },
  {
    id: "driver_boat_racer_updated_2015",
    name: "ドライバー / ボートレーサー",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["機械修理", "聞き耳", "重機械操作", "電気修理", "ナビゲート", "値切り", "目星"],
    skillOptions: [
      {
        label: "運転（自動車、二輪車）または操縦（モーターボート）",
        choose: 1,
        options: ["運転（自動車）", "運転（二輪車）", "操縦（モーターボート）"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "熟練の「スタント」行為を成功させることができる。衝突や横転を比較的制御しながら安全に行うことも可能。",
    alliesExample: "",
    keywords: ["ドライバー", "ボートレーサー", "2010変更"],
    note: ""
  },
  {
    id: "agriculture_forestry_worker_updated_2015",
    name: "農林業作業者",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["応急手当", "機械修理", "重機械操作", "製作（農作物、畜産、養蜂など）", "追跡", "電気修理", "博物学"],
    skillOptions: [
      {
        label: "次の技能から1つ選択",
        choose: 1,
        options: ["杖", "ライフル", "ショットガン", "チェーンソー"]
      }
    ],
    pointFormula: "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "CON＋1またはSTR＋1。",
    alliesExample: "",
    keywords: ["農林業作業者", "パークレンジャー", "森林官", "マタギ", "2010変更"],
    note: ""
  },
  {
    id: "pilot_updated_2015",
    name: "パイロット",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["機械修理", "重機械操作", "電気修理", "操縦（民間プロペラ機、民間ジェット機、定期旅客機、ジェット戦闘機、ヘリコプター、飛行船）", "天文学", "ナビゲート", "物理学", "ほかの言語（英語、その他）"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "異性に対してAPP＋1。",
    alliesExample: "",
    keywords: ["パイロット", "2010変更"],
    note: ""
  },
  {
    id: "businessperson_updated_2015",
    name: "ビジネスマン",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["言いくるめ", "経理", "コンピューター", "信用", "説得", "値切り", "法律", "ほかの言語（英語、その他ビジネス相手の国の言語）"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "経理に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["ビジネスマン", "ビジネス", "2010変更"],
    note: ""
  },
  {
    id: "lawyer_updated_2015",
    name: "法律家",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["言いくるめ", "経理", "信用", "心理学", "説得", "図書館", "値切り", "法律"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "信用および法律に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["法律家", "弁護士", "2010変更"],
    note: ""
  },
  {
    id: "yakuza_member_updated_2015",
    name: "暴力団団員",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["言いくるめ", "隠す", "芸術（刺青彫り、イカサマ）", "心理学", "値切り", "目星"],
    skillOptions: [
      {
        label: "次の技能から2つ選択",
        choose: 2,
        options: ["隠れる", "こぶし（パンチ）", "キック", "組み付き", "武道（任意）", "日本刀", "ナイフ", "拳銃"]
      }
    ],
    pointFormula: "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10",
    credit: "",
    special: "EDU－1、STR＋1。",
    alliesExample: "",
    keywords: ["暴力団団員", "ヤクザ", "2010変更"],
    note: ""
  },
  {
    id: "wanderer_updated_2015",
    name: "放浪者",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["言いくるめ", "隠れる", "聞き耳", "忍び歩き", "心理学", "値切り", "目星"],
    skillOptions: [
      {
        label: "次の技能から1つ選択",
        choose: 1,
        options: ["運転（自動車）", "運転（二輪車）", "芸術（ギャンブル）", "ほかの言語（英語など）"]
      }
    ],
    pointFormula: "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10",
    credit: "",
    special: "子供に対する言いくるめと心理学に＋10%のボーナス。",
    alliesExample: "",
    keywords: ["放浪者", "2010変更"],
    note: ""
  },
  {
    id: "musician_updated_2015",
    name: "ミュージシャン",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["言いくるめ", "聞き耳", "芸術（歌唱、楽器演奏）", "製作（作詞、作曲）", "説得", "心理学", "値切り", "ほかの言語（英語など）"],
    skillOptions: [],
    pointFormula: "EDU × 10 ＋ DEX × 10",
    credit: "",
    special: "パフォーマンス成功時、言いくるめと説得に＋10%のボーナス。ファンに対してさらに＋10%のボーナス。",
    alliesExample: "",
    keywords: ["ミュージシャン", "音楽家", "2010変更"],
    note: ""
  },
  {
    id: "mental_therapist_updated_2015",
    name: "メンタルセラピスト",
    ruleType: "6e",
    ruleLabels: ["6版", "2015", "2010更新"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.15-16",
    description: "",
    skills: ["言いくるめ", "芸術（絵画、楽器演奏、歌唱、アロマなど）", "信用", "心理学", "精神分析", "説得", "法律", "ほかの言語（英語、ドイツ語など）"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "自分の患者に対する説得に＋20%のボーナス。",
    alliesExample: "",
    keywords: ["メンタルセラピスト", "セラピスト", "2010変更"],
    note: ""
  }
];
window.OCCUPATIONS_7E_EXTRA = [
  {
    id: "salesperson_playing_guide",
    name: "外交販売員／セールスマン",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "多くのビジネスにおいて欠かせない存在であり、雇い主の商品やサービスを宣伝したり販売したりする職業。",
    skills: ["運転（自動車）", "聞き耳", "経理", "心理学"],
    skillOptions: [
      {
        label: "隠密 または 手さばき",
        choose: 1,
        options: ["隠密", "手さばき"]
      },
      {
        label: "対人関係技能から2つ",
        choose: 2,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      },
      {
        label: "任意のほかの1つの技能",
        choose: 1,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 2 ＋ APP × 2",
    credit: "9～40％",
    special: "",
    alliesExample: "同じ区域内のビジネス、お気に入りの顧客",
    keywords: ["外交販売員", "セールスマン", "営業", "販売", "ビジネス"],
    note: "",
  },
  {
    id: "scientist_playing_guide",
    name: "科学者／サイエンティスト",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "企業や大学に雇われ、研究を行なう職業。1つの科学分野を専門にしていても、複数の分野に精通していることがある。",
    skills: ["目星", "ほかの言語", "母国語"],
    skillOptions: [
      {
        label: "任意の専門分野の〈科学〉を3つ",
        choose: 3,
        options: ["科学（天文学）", "科学（生物学）", "科学（化学）", "科学（地質学）", "科学（数学）", "科学（物理学）", "科学（薬学）", "科学（植物学）", "科学（動物学）", "科学（専門分野）"]
      },
      {
        label: "コンピューター または 図書館",
        choose: 1,
        options: ["コンピューター", "図書館"]
      },
      {
        label: "対人関係技能から1つ",
        choose: 1,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      }
    ],
    pointFormula: "EDU × 4",
    credit: "9〜50%",
    special: "",
    alliesExample: "ほかの科学者や教員、大学、現在および過去の雇い主。",
    keywords: ["科学者", "サイエンティスト", "研究者", "大学", "企業研究"],
    note: "",
  },
  {
    id: "student_intern_playing_guide",
    name: "学生／インターン",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "カレッジもしくは大学に在籍する学生、あるいは会社に雇われて実習訓練を受けている人。",
    skills: ["聞き耳", "図書館"],
    skillOptions: [
      {
        label: "ほかの言語 または 母国語",
        choose: 1,
        options: ["ほかの言語", "母国語"]
      },
      {
        label: "専攻分野として3つの技能",
        choose: 3,
        options: ["専攻分野に関連する技能"]
      },
      {
        label: "個人的な専門または時代に関連する任意のほかの2つの技能",
        choose: 2,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 4",
    credit: "5〜10%",
    special: "",
    alliesExample: "教員やほかの学生。一方でインターンはビジネス関係者も知っているだろう。",
    keywords: ["学生", "インターン", "大学生", "カレッジ", "実習"],
    note: "",
  },
  {
    id: "cult_leader_playing_guide",
    name: "カルト指導者／Cult Leader",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "教義を固く信じている者、あるいは金と権力のために教義を授ける者など、カルトを導く指導者。",
    skills: ["オカルト", "経理", "心理学", "目星"],
    skillOptions: [
      {
        label: "対人関係技能から2つ",
        choose: 2,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      },
      {
        label: "個人的な専門に関連する任意のほかの2つの技能",
        choose: 2,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 2 ＋ APP × 2",
    credit: "30〜60%",
    special: "",
    alliesExample: "信徒の大多数はありふれた人々だが、リーダーのカリスマ性が高ければ、映画スターや金持ちの寡婦、有名人といった信徒を得る可能性が高くなる。",
    keywords: ["カルト指導者", "Cult Leader", "宗教", "教祖", "信徒"],
    note: "",
  },
  {
    id: "book_dealer_playing_guide",
    name: "書籍商／Book Dealer",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "小売店のオーナー、あるいは専門書だけを通信販売で扱うなど、本を商う職業。",
    skills: ["運転（自動車）", "鑑定", "経理", "図書館", "歴史", "母国語", "ほかの言語"],
    skillOptions: [
      {
        label: "対人関係技能から1つ",
        choose: 1,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      }
    ],
    pointFormula: "EDU × 4",
    credit: "20〜40％",
    special: "",
    alliesExample: "書誌学者、ほかの書籍商、図書館や大学、顧客。",
    keywords: ["書籍商", "Book Dealer", "古書店", "本屋", "書誌学"],
    note: "",
  },
  {
    id: "psychologist_psychoanalyst_playing_guide",
    name: "心理学者／精神分析学者",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "心理療法やカウンセリング、組織心理学、心理学研究、教育などを担う専門家。",
    skills: ["聞き耳", "経理", "心理学", "精神分析", "説得", "図書館"],
    skillOptions: [
      {
        label: "学術的もしくは個人的な専門または時代に関連する任意のほかの2つの技能",
        choose: 2,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 4",
    credit: "10〜40%",
    special: "",
    alliesExample: "心理学分野、患者",
    keywords: ["心理学者", "精神分析学者", "カウンセラー", "心理療法", "研究者"],
    note: "",
  },
  {
    id: "stuntman_playing_guide",
    name: "スタントマン／Stuntman",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "テレビや映画などで危険なアクションを担当する職業。現代では組合に加入し、資格を証明することも多い。",
    skills: ["応急手当", "回避", "近接戦闘", "水泳", "跳躍", "登攀"],
    skillOptions: [
      {
        label: "機械修理 または 電気修理",
        choose: 1,
        options: ["機械修理", "電気修理"]
      },
      {
        label: "以下から1つの技能",
        choose: 1,
        options: ["運転（自動車）", "乗馬", "ダイビング"]
      }
    ],
    pointFormula: "EDU × 2 + DEX × 2 または EDU × 2 + STR × 2",
    credit: "10〜50%",
    special: "",
    alliesExample: "映画・テレビ業界、さまざまな発破屋や花火師、役者や監督。",
    keywords: ["スタントマン", "Stuntman", "映画", "テレビ", "アクション"],
    note: "",
  },
  {
    id: "diver_playing_guide",
    name: "ダイバー／Diver",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "軍組織や法執行機関、民間の潜水漁、サルベージ、自然保護、宝探しなどに従事する潜水の専門家。",
    skills: ["応急手当", "科学（生物学）", "機械修理", "水泳", "操縦（ボート）", "ダイビング", "目星"],
    skillOptions: [
      {
        label: "個人的な専門または時代的な専門として任意のほかの1つの技能",
        choose: 1,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 2 + DEX × 2",
    credit: "9〜30%",
    special: "",
    alliesExample: "沿岸警備隊（海上保安庁）、船長、軍人、法執行機関、密輸人。",
    keywords: ["ダイバー", "Diver", "潜水", "サルベージ", "海"],
    note: "",
  },
  {
    id: "mountain_climber_playing_guide",
    name: "登山家／Mountain Climber",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "登山指導者、ガイド、アスリート、山岳救助など、山岳環境で活動する職業。",
    skills: ["応急手当", "聞き耳", "サバイバル（山岳）", "跳躍", "追跡", "登攀", "ナビゲート", "ほかの言語"],
    skillOptions: [],
    pointFormula: "EDU × 2 + DEX × 2 または EDU × 2 + STR × 2",
    credit: "30〜60%",
    special: "",
    alliesExample: "ほかの登山家、環境保護団体、後援者、スポンサー、地元の山岳救助員や法執行機関、公園のレンジャー、スポーツクラブ",
    keywords: ["登山家", "Mountain Climber", "登山", "山岳", "ガイド"],
    note: "",
  },

  {
    id: "assassin_playing_guide",
    name: "暗殺者",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "裏社会に生き、標的を秘密裏に始末することを専門とする犯罪者職業。",
    skills: ["隠密", "鍵開け", "機械修理", "近接戦闘", "射撃", "心理学", "電気修理", "変装"],
    skillOptions: [],
    pointFormula: "EDU × 2 ＋ DEX × 2 または EDU × 2 ＋ STR × 2",
    credit: "30〜60％",
    special: "",
    alliesExample: "ごくわずかで、ほとんどは裏社会の人間。他人は彼らのことを知らない。最高の連中はストリートで身のすくむような名声を勝ち得てしまうかもしれない。",
    keywords: ["暗殺者", "犯罪者", "殺し屋", "裏社会"],
    note: "",
  },
  {
    id: "lone_criminal_playing_guide",
    name: "一匹狼の犯罪者",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "組織に強く依存せず、単独または少人数で犯罪行為を行う犯罪者職業。",
    skills: ["隠密", "鑑定", "心理学", "目星"],
    skillOptions: [
      {
        label: "鍵開け または 機械修理",
        choose: 1,
        options: ["鍵開け", "機械修理"]
      },
      {
        label: "近接戦闘 または 射撃",
        choose: 1,
        options: ["近接戦闘", "射撃"]
      },
      {
        label: "芸術／製作（演技） または 変装",
        choose: 1,
        options: ["芸術／製作（演技）", "変装"]
      },
      {
        label: "対人関係技能から1つ",
        choose: 1,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      }
    ],
    pointFormula: "EDU × 2 ＋ DEX × 2 または EDU × 2 ＋ APP × 2",
    credit: "5〜65％",
    special: "",
    alliesExample: "ほかの軽犯罪者、ストリート周りの法執行機関",
    keywords: ["一匹狼", "犯罪者", "軽犯罪", "裏社会"],
    note: "",
  },
  {
    id: "home_invader_playing_guide",
    name: "押し込み強盗",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "住居や建物へ押し入り、盗みや強奪を行う犯罪者職業。",
    skills: ["隠密", "鑑定", "鍵開け", "聞き耳", "手さばき", "登攀", "目星"],
    skillOptions: [
      {
        label: "機械修理 または 電気修理",
        choose: 1,
        options: ["機械修理", "電気修理"]
      }
    ],
    pointFormula: "EDU × 2 ＋ DEX × 2",
    credit: "5〜40％",
    special: "",
    alliesExample: "故買人、ほかの押し込み強盗",
    keywords: ["押し込み強盗", "強盗", "犯罪者", "侵入"],
    note: "",
  },
  {
    id: "forger_counterfeiter_playing_guide",
    name: "偽造犯／偽金造り",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "文書、金銭、証明書などの偽造を行う犯罪者職業。",
    skills: ["鑑定", "芸術／製作（文書偽造）", "経理", "手さばき", "図書館", "目星", "歴史"],
    skillOptions: [
      {
        label: "個人的な専門あるいは時代に関連する任意のほかの1つの技能",
        choose: 1,
        options: ["コンピューター", "任意の技能"]
      }
    ],
    pointFormula: "EDU × 4",
    credit: "20〜40％",
    special: "",
    alliesExample: "犯罪組織、ビジネスマン",
    keywords: ["偽造犯", "偽金造り", "犯罪者", "文書偽造"],
    note: "",
  },
  {
    id: "bank_robber_playing_guide",
    name: "銀行強盗",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "銀行や金融機関を襲撃し、金銭を強奪する犯罪者職業。",
    skills: ["威圧", "運転（自動車）", "鍵開け", "近接戦闘", "射撃", "重機械操作"],
    skillOptions: [
      {
        label: "機械修理 または 電気修理",
        choose: 1,
        options: ["機械修理", "電気修理"]
      },
      {
        label: "個人的専門あるいは時代に関連する任意のほかの1つ",
        choose: 1,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 2 ＋ STR × 2 または EDU × 2 ＋ DEX × 2",
    credit: "5〜75％",
    special: "",
    alliesExample: "ほかのギャング（現役もしくは引退した）、フリーランスの犯罪者、犯罪組織",
    keywords: ["銀行強盗", "強盗", "犯罪者", "ギャング"],
    note: "",
  },
  {
    id: "fence_playing_guide",
    name: "故買人（こかいにん）",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "盗品や非合法な品物を売買し、闇市場や合法的な買い手との橋渡しをする犯罪者職業。",
    skills: ["鑑定", "芸術／製作（偽造）", "経理", "図書館", "目星", "歴史"],
    skillOptions: [
      {
        label: "対人関係技能から1つ",
        choose: 1,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      },
      {
        label: "ほかの1つ",
        choose: 1,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 2 ＋ APP × 2",
    credit: "20〜40％",
    special: "",
    alliesExample: "犯罪組織、商売相手、闇市場および合法的な買い手",
    keywords: ["故買人", "盗品商", "犯罪者", "闇市場"],
    note: "",
  },
  {
    id: "con_artist_playing_guide",
    name: "詐欺師",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "言葉や演技、心理操作を用いて相手を欺く犯罪者職業。",
    skills: ["鑑定", "聞き耳", "芸術／製作（演技）", "心理学", "手さばき"],
    skillOptions: [
      {
        label: "法律 または ほかの言語",
        choose: 1,
        options: ["法律", "ほかの言語"]
      },
      {
        label: "対人関係技能から2つ",
        choose: 2,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      }
    ],
    pointFormula: "EDU × 2 ＋ APP × 2",
    credit: "10〜65％",
    special: "",
    alliesExample: "ほかの詐欺師、フリーランスの犯罪者",
    keywords: ["詐欺師", "ペテン師", "犯罪者", "演技"],
    note: "",
  },
  {
    id: "bootlegger_gangster_playing_guide",
    name: "酒密売人／ギャング",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "密造酒や違法な商売、組織犯罪に関わる犯罪者職業。",
    skills: ["運転（自動車）", "隠密", "近接戦闘", "射撃", "心理学", "目星"],
    skillOptions: [
      {
        label: "対人関係技能から2つ",
        choose: 2,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      }
    ],
    pointFormula: "EDU × 2 ＋ STR × 2",
    credit: "5〜30％",
    special: "",
    alliesExample: "犯罪組織、ストリート周りの法執行機関、地元の商店主",
    keywords: ["酒密売人", "ギャング", "犯罪者", "密売"],
    note: "",
  },
  {
    id: "female_criminal_1920s_playing_guide",
    name: "女性犯罪者［1920年代］",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者", "1920年代"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "1920年代における犯罪組織や裏社会と関わりを持つ女性犯罪者職業。",
    skills: ["運転（自動車）", "隠密", "聞き耳"],
    skillOptions: [
      {
        label: "近接戦闘（格闘） または 射撃（ピストル）",
        choose: 1,
        options: ["近接戦闘（格闘）", "射撃（ピストル）"]
      },
      {
        label: "芸術／製作（専門分野を選ぶ）",
        choose: 1,
        options: ["芸術／製作（専門分野）"]
      },
      {
        label: "対人関係技能から2つ",
        choose: 2,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      },
      {
        label: "個人的な専門に関連する任意のほかの1つ",
        choose: 1,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 2 ＋ APP × 2",
    credit: "10〜80％",
    special: "収入はボーイフレンドの収入に依存している。",
    alliesExample: "ギャング、法執行機関、地元のビジネスマン",
    keywords: ["女性犯罪者", "1920年代", "犯罪者", "ギャング"],
    note: "",
  },
  {
    id: "street_punk_playing_guide",
    name: "ストリート・パンク",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "街頭で活動する若い犯罪者や荒事に慣れた不良の職業。",
    skills: ["隠密", "近接戦闘", "射撃", "跳躍", "手さばき", "投擲", "登攀"],
    skillOptions: [
      {
        label: "対人関係技能から1つ",
        choose: 1,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      }
    ],
    pointFormula: "EDU × 2 ＋ DEX × 2 または EDU × 2 ＋ STR × 2",
    credit: "5〜10％",
    special: "",
    alliesExample: "軽犯罪者、ほかのパンク、地元の故売人、そのほか地元のギャングスターにもいるだろうし間違いなく地元の警察にもいる。",
    keywords: ["ストリート・パンク", "不良", "犯罪者", "軽犯罪"],
    note: "",
  },
  {
    id: "smuggler_playing_guide",
    name: "密輸人",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "犯罪者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "品物や人員を秘密裏に運び、税関や法執行機関を避けて活動する犯罪者職業。",
    skills: ["聞き耳", "射撃", "心理学", "手さばき", "ナビゲート", "目星"],
    skillOptions: [
      {
        label: "運転（自動車） または 操縦（航空機またはボート）",
        choose: 1,
        options: ["運転（自動車）", "操縦（航空機）", "操縦（ボート）"]
      },
      {
        label: "対人関係技能から1つ",
        choose: 1,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      }
    ],
    pointFormula: "EDU × 2 ＋ APP × 2 または EDU × 2 ＋ DEX × 2",
    credit: "20〜60％",
    special: "",
    alliesExample: "犯罪組織、沿岸警備隊、税関職員",
    keywords: ["密輸人", "密輸", "犯罪者", "税関"],
    note: "",
  },

  {
    id: "secretary_playing_guide",
    name: "秘書／Secretary",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "企業や事務所において組織を支える中核的な存在。書類整理やスケジュール管理、来客対応や社内外とのやりとりを担う。",
    skills: ["経理", "図書館", "目星", "心理学", "説得", "魅惑", "聞き耳", "母国語"],
    skillOptions: [],
    pointFormula: "EDU × 2 + DEX × 2 または EDU × 2 + APP × 2",
    credit: "9〜30%",
    special: "",
    alliesExample: "ほかの事務職、雇われている会社の重役",
    keywords: ["秘書", "Secretary", "事務職", "スケジュール管理"],
    note: "",
  },
  {
    id: "editor_playing_guide",
    name: "編集者／Editor",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "本や新聞、雑誌の発行に関わり、文章への理解と幅広い人脈を持つ職業。記事のチェックや取材対応など、情報の交通整理を担うこともある。",
    skills: ["経理", "心理学", "目星", "歴史", "母国語"],
    skillOptions: [
      {
        label: "対人関係技能から2つ",
        choose: 2,
        options: ["威圧", "言いくるめ", "説得", "魅惑"]
      },
      {
        label: "その他の任意の技能1つ",
        choose: 1,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 4",
    credit: "10〜30%",
    special: "",
    alliesExample: "新聞産業、地元の官公庁、専門家、出版者",
    keywords: ["編集者", "Editor", "出版", "新聞", "雑誌"],
    note: "",
  },
  {
    id: "boxer_wrestler_playing_guide",
    name: "ボクサー／レスラー／Boxer / Wrestler",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "鍛え抜かれた肉体と精神で観客を魅了する格闘家。犯罪組織やプロモーターとの繋がりを持つこともある。",
    skills: ["威圧", "回避", "近接戦闘（格闘）", "心理学", "跳躍", "目星"],
    skillOptions: [
      {
        label: "個人的な専門または時代に関連する任意の2技能",
        choose: 2,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 2 + STR × 2",
    credit: "9〜60%",
    special: "",
    alliesExample: "スポーツのプロモーター、ジャーナリスト、犯罪組織、プロのトレーナー",
    keywords: ["ボクサー", "レスラー", "Boxer", "Wrestler", "格闘家"],
    note: "",
  },
  {
    id: "big_game_hunter_playing_guide",
    name: "猛獣ハンター／Big Game Hunter",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "異国の地で猛獣を狩る、サバイバル技術と地理的知識に長けた冒険家。富裕層の依頼や闇市場との関係を持つこともある。",
    skills: ["隠密", "自然", "射撃", "追跡", "ナビゲート"],
    skillOptions: [
      {
        label: "科学分野から1つ",
        choose: 1,
        options: ["科学（植物学）", "科学（生物学）", "科学（動物学）"]
      },
      {
        label: "聞き耳 または 目星",
        choose: 1,
        options: ["聞き耳", "目星"]
      },
      {
        label: "サバイバル または ほかの言語",
        choose: 1,
        options: ["サバイバル", "ほかの言語"]
      }
    ],
    pointFormula: "EDU × 2 + DEX × 2 または EDU × 2 + STR × 2",
    credit: "20〜50%",
    special: "",
    alliesExample: "外国政府の官吏、猟場の管理人、裕福な顧客、闇市場の売人、動物園のオーナー",
    keywords: ["猛獣ハンター", "Big Game Hunter", "狩猟", "冒険家", "サバイバル"],
    note: "",
  },

  {
    id: "unskilled_laborer_playing_guide",
    name: "未熟練労働者／Unskilled Laborer",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "労働者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "工具、製粉工、紡績工、港湾労働者、道路工事作業者、鉱山労働者、建設作業員などを含む労働者のうち、特別な技能を持たない現場労働者。",
    skills: ["運転（自動車）", "応急手当", "機械修理", "近接戦闘", "重機械操作", "電気修理", "投擲"],
    skillOptions: [
      {
        label: "個人的な専門あるいは時代に関連する任意のほかの1つの技能",
        choose: 1,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 2 + DEX × 2 または EDU × 2 + STR × 2",
    credit: "9〜30%",
    special: "",
    alliesExample: "その産業に従事するほかの労働者や監督。",
    keywords: ["未熟練労働者", "Unskilled Laborer", "労働者", "現場", "工事"],
    note: "",
  },
  {
    id: "lumberjack_playing_guide",
    name: "木こり／Lumberjack",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "労働者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "林業に従事し、斧やチェーンソーなどを扱いながら森林で働く労働者。",
    skills: ["応急手当", "回避", "機械修理", "近接戦闘（チェーンソー）", "跳躍", "投擲", "登攀"],
    skillOptions: [
      {
        label: "科学（生物学または植物学） もしくは 自然",
        choose: 1,
        options: ["科学（生物学）", "科学（植物学）", "自然"]
      }
    ],
    pointFormula: "EDU × 2 + DEX × 2 または EDU × 2 + STR × 2",
    credit: "9〜30%",
    special: "",
    alliesExample: "林業従事者、野外ガイドや自然保護活動家。",
    keywords: ["木こり", "Lumberjack", "林業", "チェーンソー", "労働者"],
    note: "",
  },
  {
    id: "miner_playing_guide",
    name: "鉱山労働者／Miner",
    ruleType: "7e",
    ruleLabels: ["7版", "プレイングガイド", "労働者"],
    source: "クトゥルフ神話TRPGプレイングガイド",
    sourceShort: "プレイングガイド",
    page: "p.242-255",
    description: "鉱山で採掘や現場作業に従事し、地質や重機の扱いにも関わる労働者。",
    skills: ["隠密", "科学（地質学）", "機械修理", "重機械操作", "跳躍", "登攀", "目星"],
    skillOptions: [
      {
        label: "個人的な専門あるいは時代に関連する任意のほかの1つの技能",
        choose: 1,
        options: ["任意の技能"]
      }
    ],
    pointFormula: "EDU × 2 + DEX × 2 または EDU × 2 + STR × 2",
    credit: "9〜30%",
    special: "",
    alliesExample: "労働組合員、政治結社。",
    keywords: ["鉱山労働者", "Miner", "鉱山", "採掘", "労働者"],
    note: "",
  },
];
