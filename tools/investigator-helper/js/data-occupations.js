window.OCCUPATIONS = [
  {
    id: "private_detective_6e",
    name: "私立探偵",
    ruleType: "6e",
    ruleLabels: ["6版"],
    source: "6版・基本ルールブック",
    sourceShort: "基本ルールブック",
    page: "p.x",
    description: "調査、尾行、聞き込みなどを行う職業サンプル。",
    skills: ["言いくるめ", "鍵開け", "写真術", "心理学", "図書館", "値切り", "法律", "目星"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "",
    alliesExample: "",
    keywords: ["探偵", "調査", "尾行", "聞き込み"],
    note: "",
  },
  {
    id: "journalist_2015",
    name: "ジャーナリスト",
    ruleType: "6e",
    ruleLabels: ["6版", "2015"],
    source: "クトゥルフ2015",
    sourceShort: "クトゥルフ2015",
    page: "p.x",
    description: "事件や社会問題を追い、取材と文章で真相に迫る職業サンプル。",
    skills: ["言いくるめ", "写真術", "心理学", "説得", "図書館", "母国語", "歴史", "目星"],
    skillOptions: [],
    pointFormula: "EDU × 20",
    credit: "",
    special: "情報収集や取材に関する補足をここに記載。",
    alliesExample: "",
    keywords: ["記者", "取材", "報道", "記事"],
    note: "",
  },
  {
    id: "doctor_7e",
    name: "医師",
    ruleType: "7e",
    ruleLabels: ["7版"],
    source: "7版・基本ルールブック",
    sourceShort: "7版・基本ルールブック",
    page: "p.x",
    description: "医学的知識と治療技術を持つ専門職。",
    skills: ["医学", "応急手当", "科学（生物学）", "科学（薬学）", "心理学", "ほかの言語", "任意の専門技能2つ"],
    skillOptions: [],
    pointFormula: "EDU × 4",
    credit: "30～80%",
    special: "",
    alliesExample: "",
    keywords: ["医療", "病院", "治療", "医者"],
    note: "",
  },
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
  { "id": "animal_therapist_2015", "name": "アニマルセラピスト", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["聞き耳", "心理学", "精神分析", "生物学", "跳躍", "追跡", "博物学"], "skillOptions": [{ "label": "個人的な関心の技能1つ", "choose": 1, "options": ["任意の技能"] }], "pointFormula": "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10", "credit": "", "special": "動物が懐きやすい。", "alliesExample": "", "keywords": ["動物", "セラピスト", "心理", "医療系"], "note": "" },
  { "id": "nurse_2015", "name": "看護師", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["科学", "生物学", "応急手当", "薬学", "心理学", "聞き耳", "目星"], "skillOptions": [{ "label": "言いくるめ または 説得", "choose": 1, "options": ["言いくるめ", "説得"] }], "pointFormula": "EDU × 20", "credit": "", "special": "信用に+10%のボーナス。患者に対する説得に+10%のボーナス。", "alliesExample": "", "keywords": ["看護師", "医療", "病院"], "note": "" },
  { "id": "emergency_medical_technician_2015", "name": "救急救命士", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["医学", "応急手当", "科学", "鍵開け", "機械修理", "電気修理", "登攀"], "skillOptions": [], "pointFormula": "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10", "credit": "", "special": "人間や自然界の動物の死体を見ても正気度ポイントを失わない。ただし、超自然的な原因で死亡していた場合は通常通り正気度ポイントを失う。", "alliesExample": "", "keywords": ["救急", "救命", "医療", "死体耐性"], "note": "" },
  { "id": "plastic_surgeon_2015", "name": "形成外科医", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["医学", "応急手当", "経理", "心理学", "説得", "値切り", "薬学", "ほかの言語（英語）"], "skillOptions": [], "pointFormula": "EDU × 10 ＋ DEX × 10", "credit": "", "special": "APP+1。", "alliesExample": "", "keywords": ["医師", "形成外科", "医療", "APP"], "note": "" },
  { "id": "surgeon_dentist_2015", "name": "外科医 or 歯科医", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["医学", "応急手当", "経理", "信用", "生物学", "説得", "薬学", "ほかの言語（英語）"], "skillOptions": [], "pointFormula": "EDU × 10 ＋ DEX × 10", "credit": "", "special": "DEX+1。", "alliesExample": "", "keywords": ["医師", "外科医", "歯科医", "医療", "DEX"], "note": "" },
  { "id": "psychiatrist_2015", "name": "精神科医", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["医学", "科学", "心理学", "精神分析", "生物学", "説得", "薬学", "ほかの言語"], "skillOptions": [], "pointFormula": "EDU × 20 または EDU × 10 ＋ APP × 10", "credit": "", "special": "1件の狂気において精神分析ロールに失敗しても、環境を整えたり投薬を行うことで、再度精神分析ロールを試みることができる。", "alliesExample": "", "keywords": ["精神科医", "医療", "精神分析", "狂気"], "note": "" },
  { "id": "underground_doctor_2015", "name": "闇医者", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["医学", "応急手当", "経理", "説得", "法律", "薬学", "ほかの言語"], "skillOptions": [{ "label": "個人的な関心の技能1つ", "choose": 1, "options": ["任意の技能"] }], "pointFormula": "EDU × 20 または EDU × 10 ＋ DEX × 10", "credit": "", "special": "不十分な器具や設備でも、有り合わせの道具で十分な応急手当を行える。", "alliesExample": "", "keywords": ["闇医者", "医療", "アウトロー"], "note": "" },
  { "id": "coast_guard_2015", "name": "海上保安官", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["機械修理", "重機械操作", "信用", "操縦（船舶）", "登攀", "ナビゲート", "法律", "サバイバル（海）"], "skillOptions": [], "pointFormula": "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10", "credit": "", "special": "目星に+10%のボーナス。", "alliesExample": "", "keywords": ["海上保安官", "海", "法律", "救助"], "note": "" },
  { "id": "forensic_scientist_2015", "name": "科学捜査研究員", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["医学", "科学", "コンピューター", "写真術", "人類学", "生物学", "法律", "薬学"], "skillOptions": [], "pointFormula": "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10", "credit": "", "special": "人間や自然界の動物の死体を見ても正気度ポイントを失わない。ただし、超自然的な原因で死亡していた場合は通常通り正気度ポイントを失う。", "alliesExample": "", "keywords": ["科学捜査", "法医学", "警察", "死体耐性"], "note": "" },
  { "id": "mountain_rescue_2015", "name": "山岳救助隊員", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["応急手当", "聞き耳", "跳躍", "追跡", "登攀", "ナビゲート", "サバイバル（山）", "ほかの言語"], "skillOptions": [], "pointFormula": "EDU × 10 ＋ APP × 10 または EDU × 10 ＋ POW × 10", "credit": "", "special": "高所恐怖症でない限り、高所で恐怖を感じることはない。", "alliesExample": "", "keywords": ["山岳救助", "救助", "山", "サバイバル"], "note": "" },
  { "id": "firefighter_2015", "name": "消防士", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["運転（自動車）", "応急手当", "回避", "機械修理", "重機械操作", "跳躍", "投擲", "登攀"], "skillOptions": [], "pointFormula": "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ STR × 10", "credit": "", "special": "STR+1またはCON+1。炎に対する恐怖心を克服している。", "alliesExample": "", "keywords": ["消防士", "火災", "救助", "STR", "CON"], "note": "" },
  { "id": "artist_basic_2015", "name": "芸術家（基本）", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["心理学", "目星"], "skillOptions": [{ "label": "言いくるめ または 説得", "choose": 1, "options": ["言いくるめ", "説得"] }, { "label": "芸術（任意） または 製作（任意）", "choose": 1, "options": ["芸術（任意）", "製作（任意）"] }, { "label": "歴史 または 博物学", "choose": 1, "options": ["歴史", "博物学"] }, { "label": "次の技能から3つ選択", "choose": 3, "options": ["コンピューター", "写真術", "生物学", "天文学", "芸術（任意）", "製作（任意）"] }], "pointFormula": "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ POW × 10", "credit": "", "special": "専門とする分野の芸術または製作技能に+10%のボーナス。", "alliesExample": "", "keywords": ["芸術家", "芸術", "製作"], "note": "" },
  { "id": "dancer_2015", "name": "ダンサー", "ruleType": "6e", "ruleLabels": ["6版", "2015"], "source": "クトゥルフ2015", "sourceShort": "クトゥルフ2015", "page": "p.5-14", "description": "", "skills": ["回避", "芸術（ダンス）", "忍び歩き", "跳躍", "登攀", "目星"], "skillOptions": [{ "label": "個人的な関心の技能2つ", "choose": 2, "options": ["任意の技能"] }], "pointFormula": "EDU × 10 ＋ DEX × 10 または EDU × 10 ＋ POW × 10", "credit": "", "special": "芸術（ダンス）に+10%のボーナス。回避に+10%のボーナス。", "alliesExample": "", "keywords": ["ダンサー", "芸術", "ダンス", "回避"], "note": "" }
  // 以降の全データはファイルに含まれています。
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
