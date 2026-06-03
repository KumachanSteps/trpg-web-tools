const CHARACTERS = [
  {
    id: "hanabishi-hibana-child",
    name: "花菱 火花",
    reading: "はなびし ひばな",
    system: "coc6",
    status: "active",
    editionLabel: "CoC 6版",
    icon: "⚗",
    favorite: true,
    hasHitoku: true,
    scenario: "愚者炎症手術",
    occupation: "小学生 / 自称・科学者",
    age: "12歳",
    gender: "男性",
    height: "145cm",
    themeColor: "#E46F4F",
    themeLabel: "#E46F4F / Hibana Red",
    iacharaUrl: "#",
    summary: "父への愛情と認知欲求から科学とオカルトに傾倒する、危なっかしいトラブルメーカー。怪異への好奇心を入口に、人間として自ら行動することを学んでいきます。",
    tags: ["科学少年", "継続探索者", "hitoku ari", "学生", "科学者"],
    variants: ["通常", "笑顔", "戦闘", "負傷", "過去"],
    params: {
      STR: 8, CON: 11, POW: 12, DEX: 14, APP: 10, SIZ: 8, INT: 16, EDU: 8,
      HP: 10, MP: 12, SAN: 55, IDEA: 80, "幸運": 60, "知識": 40, DB: "-1D4", Move: 8
    },
    skills: [
      { name: "化学", value: 80, category: "知識", note: "科学少年としての中核技能。" },
      { name: "機械修理", value: 70, category: "行動", note: "実験装置や小道具の自作に使用。" },
      { name: "オカルト", value: 65, category: "知識", note: "怪異や神話的現象への好奇心。" },
      { name: "目星", value: 65, category: "探索", note: "実験対象や違和感に目ざとい。" },
      { name: "図書館", value: 60, category: "探索", note: "調査・文献探索用。" }
    ],
    items: [
      { name: "自作実験キット", type: "item", description: "小型バーナー、試験管、怪しい薬品メモなどをまとめた携帯用キット。", stats: ["item", "化学補助"] },
      { name: "改造スタンガン", type: "weapon", description: "本来は護身用だが、火花が勝手に改造している。KP裁量で使用。", stats: ["weapon", "成功率 50", "ダメージ 1D3"] },
      { name: "父の古い研究ノート", type: "important", description: "火花が科学に執着する理由に関わる私物。キャラクターメモとも連動。", stats: ["important", "memo linked"] }
    ],
    memo: {
      "概要": "火花は、父親への愛情と認知欲求から科学とオカルトに傾倒している少年です。最初は「面白そうだから」という好奇心で怪異へ踏み込みますが、セッションを通して、救済を神に願うだけでは不十分であり、人間として自らの意志で行動することの大切さを学んでいきます。",
      "性格": "好奇心旺盛で、実験好き。危なっかしい行動も多いものの、根底には認められたいという切実な欲求があります。",
      "背景": "父への憧れと認知欲求が、科学とオカルトへの傾倒につながっています。",
      "成長記録": "怪異との遭遇を通して、ただ願うのではなく自分で選び、行動することを学んでいきます。",
      "関係者": "父親、釜根陽介、後の継続先で出会う友人たち。",
      "秘匿": "ここに秘匿・HO・ネタバレ関連のメモを入れます。",
      "KPメモ": "KP向けの処理、伏線、演出メモを入れます。"
    }
  },
  {
    id: "isumi-anraku",
    name: "椅子未 安楽",
    reading: "いすみ あんらく",
    system: "coc7",
    status: "active",
    editionLabel: "CoC 7版",
    icon: "★",
    favorite: false,
    hasHitoku: false,
    scenario: "現代探索者 / ガスライト変換",
    occupation: "私立探偵",
    age: "30歳",
    gender: "男性",
    height: "172cm",
    themeColor: "#3B6EA8",
    themeLabel: "#3B6EA8 / Detective Blue",
    iacharaUrl: "#",
    summary: "安楽椅子から事件を解く、出不精な超常探偵。",
    tags: ["探偵", "呪文", "推理", "hitoku nashi"],
    variants: ["通常", "推理", "疲労"],
    params: { STR: 40, CON: 45, POW: 70, DEX: 50, APP: 55, SIZ: 60, INT: 85, EDU: 80, HP: 10, MP: 14, SAN: 48, "幸運": 65, DB: "0" },
    skills: [
      { name: "図書館", value: 85, category: "探索", note: "資料調査の主力。" },
      { name: "心理学", value: 80, category: "交渉", note: "人間観察に長ける。" },
      { name: "オカルト", value: 75, category: "知識", note: "神話的事象への理解。" }
    ],
    items: [
      { name: "安楽椅子", type: "item", description: "本人曰く、推理に必要不可欠な仕事道具。", stats: ["item"] }
    ],
    memo: {
      "概要": "真実と狂気の狭間で推理を続ける、逸脱した天才型の私立探偵です。",
      "性格": "出不精で社会性に難がありますが、推理力は非常に高いです。",
      "秘匿": "秘匿なし。"
    }
  },
  {
    id: "hachijo-ririchiyo",
    name: "蜂醸 凛々蝶",
    reading: "はちじょう りりちよ",
    system: "emoklore",
    status: "active",
    editionLabel: "エモクロア",
    icon: "刀",
    favorite: true,
    hasHitoku: false,
    scenario: "界獣",
    occupation: "女子高生 / 付き人",
    age: "17歳",
    gender: "女性",
    height: "162cm",
    themeColor: "#5B6474",
    themeLabel: "#5B6474 / Blade Gray",
    iacharaUrl: "#",
    summary: "若を守るために刃を抜く、クールな武士系付き人。",
    tags: ["武士", "護衛", "学生", "hitoku nashi"],
    variants: ["通常", "抜刀", "制服"],
    params: { "身体": 2, "器用": 5, "精神": 6, "五感": 3, "知力": 5, "魅力": 3, "社会": 1, "運勢": 6, HP: 12, MP: 11, "共鳴": 1 },
    skills: [
      { name: "抜刀術", value: 3, category: "戦闘", note: "護衛対象を守るための技術。" },
      { name: "観察眼", value: 2, category: "探索", note: "脅威の察知。" }
    ],
    items: [
      { name: "竹刀袋", type: "item", description: "刀を隠すための袋。", stats: ["item"] }
    ],
    memo: {
      "概要": "冷静沈着な仕事人タイプ。護衛対象への脅威に対しては積極的な武力行使を是とします。",
      "性格": "任務遂行を最優先する、クールな付き人です。"
    }
  },
  {
    id: "jona-larson",
    name: "Jona Larson",
    reading: "ヨナ・ラーソン",
    system: "coc6",
    status: "retire",
    editionLabel: "CoC 6版",
    icon: "🎭",
    favorite: false,
    hasHitoku: true,
    scenario: "オペラ座より",
    occupation: "演劇部員",
    age: "高校4年生",
    gender: "男性",
    height: "178cm",
    themeColor: "#B88A36",
    themeLabel: "#B88A36 / Stage Gold",
    iacharaUrl: "#",
    summary: "ステージ上で輝く、金髪碧眼の美しい演劇部員。",
    tags: ["俳優", "学生", "芸術家", "hitoku ari"],
    variants: ["通常", "舞台", "10年後"],
    params: { STR: 10, CON: 11, POW: 13, DEX: 15, APP: 17, SIZ: 13, INT: 14, EDU: 12, HP: 12, MP: 13, SAN: 60, "幸運": 65, DB: "0" },
    skills: [
      { name: "芸術（演劇）", value: 80, category: "芸術", note: "舞台上のカリスマ性。" },
      { name: "信用", value: 75, category: "交渉", note: "人を惹きつける魅力。" }
    ],
    items: [{ name: "舞台台本", type: "item", description: "大切にしている台本。", stats: ["item"] }],
    memo: { "概要": "天性の器用さとカリスマ性を持つ演劇部員です。", "秘匿": "内面の悩みに関するメモ。" }
  },
  {
    id: "ho4-boxer",
    name: "HO4 Boxer",
    reading: "ボクサー",
    system: "coc6",
    status: "active",
    editionLabel: "CoC 6版",
    icon: "🥊",
    favorite: false,
    hasHitoku: true,
    scenario: "K9-COLLECT.PP",
    occupation: "警察官",
    age: "20代",
    gender: "男性",
    height: "高身長",
    themeColor: "#D26A8A",
    themeLabel: "#D26A8A / Beauty Pink",
    iacharaUrl: "#",
    summary: "美しさと強さを両立し、人々を守るオネエ系警察官。",
    tags: ["警察官", "ボクサー", "刑事", "hitoku ari"],
    variants: ["通常", "戦闘", "メイク"],
    params: { STR: 16, CON: 14, POW: 12, DEX: 13, APP: 14, SIZ: 15, INT: 12, EDU: 14, HP: 15, MP: 12, SAN: 60, "幸運": 60, DB: "+1D4" },
    skills: [
      { name: "組み付き", value: 90, category: "戦闘", note: "ボクサーとしての制圧力。" },
      { name: "こぶし", value: 80, category: "戦闘", note: "鍛え抜かれた拳。" }
    ],
    items: [{ name: "メイクポーチ", type: "item", description: "美しさを保つための必需品。", stats: ["item"] }],
    memo: { "概要": "自己発見、家族との和解、社会への貢献を貫く英雄譚的キャラクターです。", "秘匿": "HO4関連情報。" }
  }
];
