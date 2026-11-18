# Mapping tables for the Music Library build (shared by build + review doc)

SCENES = ['intro', 'daily', 'social', 'travel', 'exploration', 'deduction', 'negotiation', 'infiltration',
          'anomaly', 'chase', 'battle', 'ritual', 'incident', 'flashback', 'parting', 'reunion',
          'revelation', 'decision', 'break', 'ending']
TONES = ['light', 'calm', 'fresh', 'comical', 'elegant', 'romantic', 'nostalgic', 'fantastical', 'moving',
         'hopeful', 'uplifting', 'uneasy', 'fearful', 'madness', 'tense', 'cold', 'gloomy', 'sad', 'lonely',
         'despair', 'grand', 'intense', 'heroic', 'driving', 'quiet', 'weighty']
SETTINGS = ['modern', 'japanese', 'western-classic', 'fantasy', 'cyber', 'scifi-space', 'steampunk', 'cthulhu',
            'post-apocalyptic', 'school', 'mansion', 'urban', 'nature', 'ruins', 'sacred']

SHELVES = ['intro', 'daily', 'comic', 'conversation', 'exploration', 'deduction', 'negotiation', 'unease',
           'horror', 'tension', 'battle', 'sad', 'moving', 'climax', 'epilogue']

# old tab -> (new shelf or None, default tags)
OLD_TABS = {
    'intro':     ('intro',       {'scene': ['intro']}),
    'explore':   ('exploration', {'scene': ['exploration']}),
    'deduction': ('deduction',   {'scene': ['deduction']}),
    'tension':   ('tension',     {'tone': ['tense']}),
    'climax':    ('climax',      {}),
    'epilogue':  ('epilogue',    {'scene': ['ending']}),
    'daily':     ('daily',       {'scene': ['daily']}),
    'comic':     ('comic',       {'tone': ['comical']}),
    'moving':    ('moving',      {'tone': ['moving']}),
    'sad':       ('sad',         {'tone': ['sad']}),
    'unease':    ('unease',      {'tone': ['uneasy']}),
    'horror':    ('horror',      {'tone': ['fearful']}),
    'digital':   (None,          {'setting': ['cyber']}),
    'mansion':   (None,          {'setting': ['mansion']}),
    'wafu':      (None,          {'setting': ['japanese']}),
    'fantasy':   (None,          {'setting': ['fantasy']}),
    'celtic':    (None,          {'setting': ['nature'], 'tone': ['nostalgic']}),
    'ethnic':    (None,          {}),
    'adult':     ('conversation', {'scene': ['social'], 'tone': ['elegant'], 'setting': ['urban']}),
    'jazz':      ('conversation', {'scene': ['social'], 'tone': ['elegant'], 'setting': ['urban']}),
    'piano':     (None,          {'tone': ['quiet']}),
    'classical': (None,          {'setting': ['western-classic'], 'tone': ['elegant']}),
    'ncs':       (None,          {'tone': ['driving']}),
}

# OpenTracks tag code -> tags
OT = {
    'm01': {'tone': ['light']},        # 明るい
    'm02': {'tone': ['light']},        # 楽しい
    'm03': {'tone': ['calm']},         # 温かい
    'm04': {'tone': ['calm']},         # 穏やか
    'm05': {'tone': ['calm']},         # 優しい
    'm06': {'tone': ['nostalgic']},    # 懐かしい
    'm07': {'tone': ['fantastical']},  # 不思議
    'm09': {'tone': ['light']},        # 可愛い
    'm12': {'tone': ['quiet']},        # 慎ましい
    'm13': {'tone': ['lonely']},       # 寂しい
    'm14': {'tone': ['sad']},          # 切ない
    'm15': {'tone': ['cold']},         # 冷たい
    'm16': {'tone': ['gloomy']},       # 暗い
    'm17': {'tone': ['sad']},          # 悲しい
    'm18': {'tone': ['intense']},      # 怒り
    'm19': {'tone': ['fearful']},      # 恐ろしい
    'm20': {'tone': ['intense']},      # 激しい
    'm21': {'setting': ['cyber']},     # ｻｲﾊﾞｰ
    'm22': {'setting': ['fantasy'], 'tone': ['fantastical']},  # ﾌｧﾝﾀｼﾞｰ
    'm23': {'tone': ['comical']},      # ｺﾒﾃﾞｨｰ
    'm24': {'tone': ['uneasy']},       # 悪意
    'm25': {'tone': ['uneasy']},       # 怪しい
    'm26': {'tone': ['despair']},      # 絶望
    'm27': {'tone': ['hopeful']},      # 希望
    'm29': {'tone': ['cold']},         # 虚無
    'm30': {'tone': ['fresh']},        # 爽やか
    'm31': {'tone': ['elegant']},      # お洒落
    'm32': {'tone': ['heroic']},       # 力強い
    'm34': {'tone': ['tense']},        # 緊張感
    'm35': {'scene': ['daily']},       # 日常
    'm36': {'tone': ['uplifting']},    # 情熱
    'm38': {'tone': ['quiet']},        # 淡白
    'r06': {'tone': ['driving']},      # 速い
    'r10': {'tone': ['light']},        # 軽快
    'r11': {'tone': ['weighty']},      # 鈍重
    'r22': {'tone': ['calm']},         # ﾋｰﾘﾝｸﾞ
    'r23': {'setting': ['japanese']},  # 和風
    'r29': {'tone': ['grand']},        # 壮大
}
# deliberately unmapped: m08 騒々しい, m10 渋い, m28 ｼﾘｱｽ, m33 弱々しい, m37 冷静, genre/rhythm r-codes other than above, all instruments

# PeriTune tag slug -> tags
PT = {
    'ambient': {'tone': ['quiet']}, 'beautiful': {'tone': ['elegant']}, 'celtic': {'setting': ['nature'], 'tone': ['nostalgic']},
    'chamber': {'tone': ['elegant']}, 'chillin': {'tone': ['calm']}, 'cinematic': {'tone': ['grand']},
    'cold': {'tone': ['cold']}, 'comical': {'tone': ['comical']}, 'cute': {'tone': ['light']},
    'doleful': {'tone': ['sad']}, 'dreary': {'tone': ['gloomy']}, 'everyday': {'scene': ['daily']},
    'fairy-tale': {'tone': ['fantastical']}, 'fancy': {'tone': ['fantastical']},
    'fantasy': {'setting': ['fantasy'], 'tone': ['fantastical']}, 'fierce': {'tone': ['intense']},
    'fight': {'scene': ['battle'], 'tone': ['intense']}, 'folk-music': {'tone': ['nostalgic']}, 'folk': {'tone': ['nostalgic']},
    'fun': {'tone': ['light']}, 'gentle': {'tone': ['calm']}, 'gorgeous': {'tone': ['elegant']},
    'gothic': {'setting': ['mansion', 'western-classic']}, 'hard_rock': {'tone': ['intense']},
    'healing': {'tone': ['calm']}, 'hope': {'tone': ['hopeful']}, 'horror': {'tone': ['fearful']},
    'hot': {'tone': ['uplifting']}, 'japanese_style': {'setting': ['japanese']}, 'kind': {'tone': ['calm']},
    'magnificent': {'tone': ['grand']}, 'natural': {'setting': ['nature']}, 'pop': {'tone': ['light']},
    'powerful': {'tone': ['heroic']}, 'quiet': {'tone': ['quiet']}, 'refreshing': {'tone': ['fresh']},
    'sad': {'tone': ['sad']}, 'scary': {'tone': ['fearful']}, 'stately': {'tone': ['weighty']},
    'suspicious': {'tone': ['uneasy']}, 'wonder': {'tone': ['fantastical']},
    'baroque': {'setting': ['western-classic']}, 'christmas': {'tone': ['uplifting']}, 'halloween': {'tone': ['comical']},
    'sf': {'setting': ['scifi-space']}, 'cyber': {'setting': ['cyber']}, 'battle': {'scene': ['battle'], 'tone': ['intense']},
    'church': {'setting': ['sacred']}, 'organ': {}, 'asian': {}, 'chinese': {}, 'arabian': {},
    'medieval': {'setting': ['fantasy']}, 'tango': {'tone': ['elegant', 'romantic']}, 'minimal': {'tone': ['quiet']},
    'electronica': {}, 'jingle': {}, 'vocal': {}, 'orchestra': {}, 'piano': {}, 'classical': {}, 'cool': {},
}

# title keywords (case-insensitive regex) -> tags
TITLE = [
    (r'戦い|戦闘|合戦|決戦|対決|バトル|battle|fight|combat|duel', {'scene': ['battle']}),
    (r'追跡|逃走|逃げ|チェイス|chase|escape|pursuit', {'scene': ['chase']}),
    (r'儀式|ritual|魔術|召喚', {'scene': ['ritual']}),
    (r'回想|追憶|記憶|思い出|memor|remini', {'scene': ['flashback']}),
    (r'真相|真実|truth|reveal', {'scene': ['revelation']}),
    (r'休憩|ティータイム|tea ?time|coffee|cafe|カフェ|喫茶', {'scene': ['break']}),
    (r'潜入|隠密|sneak|stealth|infiltrat', {'scene': ['infiltration']}),
    (r'旅|journey|travel|街角|町|town|street|散歩|walk', {'scene': ['travel']}),
    (r'密談|交渉|取引|駆け引き|deal|casino|poker|陰謀|conspir', {'scene': ['negotiation']}),
    (r'異変|異常|怪異|anomal', {'scene': ['anomaly']}),
    (r'別れ|別離|さよなら|farewell|goodbye|弔|葬|requiem|レクイエム', {'scene': ['parting']}),
    (r'再会|reunion', {'scene': ['reunion']}),
    (r'決断|決意|覚悟|resolve|decision', {'scene': ['decision']}),
    (r'騒動|ドタバタ|ハプニング|混乱|panic|chaos', {'scene': ['incident']}),
    (r'エンディング|ending|epilogue|終幕|後日', {'scene': ['ending']}),
    (r'会話|談笑|おしゃべり|talk|chat|lounge|ラウンジ|bar\b|バー', {'scene': ['social']}),
    (r'夜会|舞踏|ワルツ|waltz|masquerade|仮面舞踏', {'setting': ['mansion'], 'tone': ['elegant']}),
    (r'館|屋敷|洋館|城|castle|mansion|manor', {'setting': ['mansion']}),
    (r'聖|教会|大聖堂|church|cathedral|pray|祈り|賛美|hymn|chapel', {'setting': ['sacred']}),
    (r'学校|学園|放課後|教室|school|campus', {'setting': ['school']}),
    (r'遺跡|洞窟|地下|迷宮|ruins|cave|dungeon|labyrinth', {'setting': ['ruins']}),
    (r'森|草原|forest|prairie|meadow|山|海|river|川|湖|lake', {'setting': ['nature']}),
    (r'宇宙|space|galaxy|cosmo|星間', {'setting': ['scifi-space']}),
    (r'サイバー|cyber|電脳|hacker|ハッカー', {'setting': ['cyber']}),
    (r'スチーム|steam|歯車|蒸気', {'setting': ['steampunk']}),
    (r'クトゥルフ|cthulhu|旧支配者|深淵|abyss|邪神|ネクロノミコン', {'setting': ['cthulhu']}),
    (r'終末|荒廃|廃墟|apocalyp|wasteland|ruined', {'setting': ['post-apocalyptic']}),
    (r'狂気|狂|madness|insan|lunatic', {'tone': ['madness']}),
    (r'壮大|epic|荘厳|majest', {'tone': ['grand']}),
    (r'恋|love|romance|ロマンス|ロマンチック', {'tone': ['romantic']}),
    (r'希望|hope', {'tone': ['hopeful']}),
    (r'祭|festival|祝|celebrat|フェスタ|fiesta', {'tone': ['uplifting']}),
    (r'ハロウィン|halloween|spook', {'tone': ['comical']}),
    (r'孤独|lonely|alone|ひとり', {'tone': ['lonely']}),
    (r'絶望|despair', {'tone': ['despair']}),
    (r'ヴァンパイア|吸血鬼|vampire|ゴシック|gothic', {'setting': ['mansion', 'western-classic']}),
]

# tag-based shelf placement for tracks whose old tab has no shelf (in priority order)
ORPHAN_RULES = [
    ('scene', 'battle', 'battle'),
    ('scene', 'negotiation', 'negotiation'),
    ('scene', 'social', 'conversation'),
    ('tone', 'fearful', 'horror'),
    ('tone', 'madness', 'horror'),
    ('tone', 'uneasy', 'unease'),
    ('tone', 'tense', 'tension'),
    ('tone', 'despair', 'sad'),
    ('tone', 'sad', 'sad'),
    ('tone', 'moving', 'moving'),
    ('tone', 'hopeful', 'moving'),
    ('tone', 'comical', 'comic'),
    ('scene', 'daily', 'daily'),
    ('scene', 'exploration', 'exploration'),
]
# extra shelf memberships for any track (also tracks that already have a shelf)
EXTRA_RULES = [
    ('scene', 'battle', 'battle'),
    ('scene', 'negotiation', 'negotiation'),
    ('scene', 'social', 'conversation'),
]

# channel URL (lower-case) -> composer when the channel is one person
PERSON_CHANNELS = {
    'https://www.youtube.com/@peritune': 'PeriTune',
    'https://www.youtube.com/@koichi_maou': '森田交一',
    'https://www.youtube.com/@yuconishi': 'コニシユカ',
    'https://www.youtube.com/@matsubgm': 'MATSU',
    'https://www.youtube.com/@tak_mfk': 'Tak_mfk',
    'https://www.youtube.com/@zukisuzukibgm': 'zukisuzuki',
    'https://www.youtube.com/@hmixbgm': '秋山裕和',
    'https://www.youtube.com/@bgmusicjp': 'たう',
    'https://www.youtube.com/@zippysound': 'zippy',
    'https://www.youtube.com/@sharou': 'しゃろう',
    'https://www.youtube.com/@imatakumusic': 'imataku',
    'https://www.youtube.com/@ushirokazutaka': '宇城和孝',
    'https://www.youtube.com/@hareno3368': 'Hareno',
    'https://www.youtube.com/@nanigashisuzuki': '鈴木何某',
    'https://www.youtube.com/@ryo_lion': '音獅子',
}
