# Mapping tables for the Music Library build (v0.52 rules).
# Every tag carries a source (provider_tag / legacy_shelf / title_keyword / manual) and a status
# (suggested / provisional / confirmed). Genres and instruments go to musicStyles, never to Scene/Tone/Setting.

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
SHELF_JA = dict(zip(SHELVES, '導入 日常 コミカル 会話・交流 探索 推理・議論 密談・駆け引き 不穏・謎 ホラー・恐怖 緊迫・危機 戦闘・対決 悲しい・切ない 感動・希望 クライマックス エピローグ'.split()))
TAG_JA = {
    'scene': dict(zip(SCENES, '導入 日常 交流 移動 探索 推理 駆け引き 潜入 異変 チェイス 戦闘 儀式 騒動 回想 別離 再会 真相 決断 休憩 終幕'.split())),
    'tone': dict(zip(TONES, '軽快 穏やか 爽やか コミカル 優雅 ロマンチック 郷愁 幻想 感動 希望 高揚 不穏 恐怖 狂気 緊迫 無機質 陰鬱 悲哀 孤独 絶望 壮大 激しい 勇壮 疾走 静か 重厚'.split())),
    'setting': dict(zip(SETTINGS, '現代 和風 西洋古典 ファンタジー サイバー SF・宇宙 スチームパンク クトゥルフ神話 終末・荒廃 学園 洋館・古城 都市・裏社会 自然・野外 遺跡・地下 聖堂・宗教施設'.split())),
}

# old tab -> (shelf with provisional membership or None, legacy tags, music styles)
# Only tabs that described a scene, mood or place give tags. Genre tabs give music styles only.
OLD_TABS = {
    'intro':     ('intro',       {'scene': ['intro']}, []),
    'explore':   ('exploration', {'scene': ['exploration']}, []),
    'deduction': ('deduction',   {'scene': ['deduction']}, []),
    'tension':   ('tension',     {'tone': ['tense']}, []),
    'climax':    ('climax',      {}, []),
    'epilogue':  ('epilogue',    {'scene': ['ending']}, []),
    'daily':     ('daily',       {'scene': ['daily']}, []),
    'comic':     ('comic',       {'tone': ['comical']}, []),
    'moving':    ('moving',      {'tone': ['moving']}, []),
    'sad':       ('sad',         {'tone': ['sad']}, []),
    'unease':    ('unease',      {'tone': ['uneasy']}, []),
    'horror':    ('horror',      {'tone': ['fearful']}, []),
    'digital':   (None,          {}, ['デジタル']),
    'mansion':   (None,          {'setting': ['mansion']}, []),
    'wafu':      (None,          {'setting': ['japanese']}, ['和楽器・和風']),
    'fantasy':   (None,          {'setting': ['fantasy']}, []),
    'celtic':    (None,          {}, ['ケルト']),
    'ethnic':    (None,          {}, ['民族系']),
    'adult':     (None,          {}, ['ラウンジ・クラブ']),
    'jazz':      (None,          {}, ['ジャズ']),
    'piano':     (None,          {}, ['ピアノ']),
    'classical': (None,          {}, ['クラシック']),
    'ncs':       (None,          {}, ['EDM・NCS']),
}

# OpenTracks mood / rhythm codes -> (tags, status). 'suggested' = meaning too loose to rely on.
OT = {
    'm01': ({'tone': ['light']}, 'provisional'),        # 明るい
    'm02': ({'tone': ['light']}, 'provisional'),        # 楽しい
    'm03': ({'tone': ['calm']}, 'provisional'),         # 温かい
    'm04': ({'tone': ['calm']}, 'provisional'),         # 穏やか
    'm05': ({'tone': ['calm']}, 'provisional'),         # 優しい
    'm06': ({'tone': ['nostalgic']}, 'provisional'),    # 懐かしい
    'm07': ({'tone': ['fantastical']}, 'suggested'),    # 不思議 (ambiguous)
    'm09': ({'tone': ['light']}, 'provisional'),        # 可愛い
    'm12': ({'tone': ['quiet']}, 'provisional'),        # 慎ましい
    'm13': ({'tone': ['lonely']}, 'provisional'),       # 寂しい
    'm14': ({'tone': ['sad']}, 'provisional'),          # 切ない
    'm15': ({'tone': ['cold']}, 'provisional'),         # 冷たい
    'm16': ({'tone': ['gloomy']}, 'provisional'),       # 暗い
    'm17': ({'tone': ['sad']}, 'provisional'),          # 悲しい
    'm18': ({'tone': ['intense']}, 'provisional'),      # 怒り
    'm19': ({'tone': ['fearful']}, 'provisional'),      # 恐ろしい
    'm20': ({'tone': ['intense']}, 'provisional'),      # 激しい
    'm21': ({'setting': ['cyber']}, 'provisional'),     # ｻｲﾊﾞｰ
    'm22': ({'setting': ['fantasy']}, 'provisional'),   # ﾌｧﾝﾀｼﾞｰ (setting only)
    'm23': ({'tone': ['comical']}, 'provisional'),      # ｺﾒﾃﾞｨｰ
    'm24': ({'tone': ['uneasy']}, 'provisional'),       # 悪意
    'm25': ({'tone': ['uneasy']}, 'provisional'),       # 怪しい
    'm26': ({'tone': ['despair']}, 'provisional'),      # 絶望
    'm27': ({'tone': ['hopeful']}, 'provisional'),      # 希望
    'm29': ({'tone': ['cold']}, 'suggested'),           # 虚無 (ambiguous)
    'm30': ({'tone': ['fresh']}, 'provisional'),        # 爽やか
    'm31': ({'tone': ['elegant']}, 'provisional'),      # お洒落
    'm32': ({'tone': ['heroic']}, 'suggested'),         # 力強い (ambiguous)
    'm34': ({'tone': ['tense']}, 'provisional'),        # 緊張感
    'm35': ({'scene': ['daily']}, 'provisional'),       # 日常
    'm36': ({'tone': ['uplifting']}, 'suggested'),      # 情熱 (ambiguous)
    'm38': ({'tone': ['quiet']}, 'provisional'),        # 淡白
    'r06': ({'tone': ['driving']}, 'suggested'),        # 速い (tempo only)
    'r10': ({'tone': ['light']}, 'provisional'),        # 軽快
    'r11': ({'tone': ['weighty']}, 'provisional'),      # 鈍重
    'r23': ({'setting': ['japanese']}, 'provisional'),  # 和風
    'r29': ({'tone': ['grand']}, 'provisional'),        # 壮大
}
OT_UNUSED = ['m08 騒々しい', 'm10 渋い', 'm28 ｼﾘｱｽ', 'm33 弱々しい', 'm37 冷静']
# OpenTracks genre (r) and instrument (i) codes that go to musicStyles (name taken from the site, NFKC-normalised)
OT_STYLE_CODES = {'r12', 'r13', 'r14', 'r15', 'r16', 'r17', 'r18', 'r19', 'r20', 'r21', 'r22', 'r24', 'r25', 'r27', 'r28',
                  'r30', 'r31', 'r32', 'r33', 'r34', 'r35'} | {f'i{n:02d}' for n in range(1, 27)}

# PeriTune tag -> (tags, status, styles)
PT = {
    'beautiful': ({'tone': ['elegant']}, 'provisional', []), 'chillin': ({'tone': ['calm']}, 'provisional', []),
    'cold': ({'tone': ['cold']}, 'provisional', []), 'comical': ({'tone': ['comical']}, 'provisional', []),
    'cute': ({'tone': ['light']}, 'provisional', []), 'doleful': ({'tone': ['sad']}, 'provisional', []),
    'dreary': ({'tone': ['gloomy']}, 'provisional', []), 'everyday': ({'scene': ['daily']}, 'provisional', []),
    'fairy-tale': ({'tone': ['fantastical']}, 'provisional', []), 'fancy': ({'tone': ['fantastical']}, 'suggested', []),
    'fantasy': ({'setting': ['fantasy']}, 'provisional', []), 'fierce': ({'tone': ['intense']}, 'provisional', []),
    'fight': ({'scene': ['battle']}, 'provisional', []), 'fun': ({'tone': ['light']}, 'provisional', []),
    'gentle': ({'tone': ['calm']}, 'provisional', []), 'gorgeous': ({'tone': ['elegant']}, 'provisional', []),
    'gothic': ({'setting': ['western-classic']}, 'suggested', ['ゴシック']), 'healing': ({'tone': ['calm']}, 'provisional', ['ヒーリング']),
    'hope': ({'tone': ['hopeful']}, 'provisional', []), 'horror': ({'tone': ['fearful']}, 'provisional', []),
    'hot': ({'tone': ['uplifting']}, 'suggested', []), 'japanese_style': ({'setting': ['japanese']}, 'provisional', ['和風']),
    'kind': ({'tone': ['calm']}, 'provisional', []), 'magnificent': ({'tone': ['grand']}, 'provisional', []),
    'natural': ({'setting': ['nature']}, 'provisional', []), 'powerful': ({'tone': ['heroic']}, 'suggested', []),
    'quiet': ({'tone': ['quiet']}, 'provisional', []), 'refreshing': ({'tone': ['fresh']}, 'provisional', []),
    'sad': ({'tone': ['sad']}, 'provisional', []), 'scary': ({'tone': ['fearful']}, 'provisional', []),
    'stately': ({'tone': ['weighty']}, 'provisional', []), 'suspicious': ({'tone': ['uneasy']}, 'provisional', []),
    'wonder': ({'tone': ['fantastical']}, 'suggested', []), 'medieval': ({'setting': ['fantasy']}, 'suggested', ['中世風']),
    '中世': ({'setting': ['fantasy']}, 'suggested', ['中世風']),
    # genres / instruments only
    'ambient': ({}, '', ['アンビエント']), 'celtic': ({}, '', ['ケルト']), 'chamber': ({}, '', ['室内楽']),
    'cinematic': ({}, '', ['シネマ']), 'classical': ({}, '', ['クラシック']), 'baroque': ({}, '', ['バロック']),
    'folk': ({}, '', ['フォーク']), 'folk-music': ({}, '', ['民族音楽']), 'hard_rock': ({}, '', ['ハードロック']),
    'orchestra': ({}, '', ['オーケストラ']), 'piano': ({}, '', ['ピアノ']), 'pop': ({}, '', ['ポップ']),
    'tango': ({}, '', ['タンゴ']), 'minimal': ({}, '', ['ミニマル']), 'electronica': ({}, '', ['エレクトロニカ']),
    'cyber': ({'setting': ['cyber']}, 'provisional', []), 'asian': ({}, '', ['アジア風']), 'コーラス': ({}, '', ['コーラス']),
    'レトロゲーム': ({}, '', ['レトロゲーム']), 'vocal': ({}, '', ['ボーカル']),
    # no tag at all
    'ハロウィン': ({}, '', []), 'halloween': ({}, '', []), 'cool': ({}, '', []), 'jingle': ({}, '', []),
}

# title keywords -> tags (always 'suggested': candidates, not facts)
TITLE = [
    (r'戦い|戦闘|合戦|決戦|対決|バトル|battle|fight|combat|duel', {'scene': ['battle']}),
    (r'追跡|逃走|逃げ|チェイス|chase|escape|pursuit', {'scene': ['chase']}),
    (r'儀式|ritual|魔術|召喚', {'scene': ['ritual']}),
    (r'回想|追憶|記憶|思い出|memor|remini', {'scene': ['flashback']}),
    (r'真相|真実|truth|reveal', {'scene': ['revelation']}),
    (r'休憩|ティータイム|tea ?time|coffee|cafe|カフェ|喫茶', {'scene': ['break']}),
    (r'潜入|隠密|sneak|stealth|infiltrat', {'scene': ['infiltration']}),
    (r'旅|journey|travel|街角|town|street|散歩|walk', {'scene': ['travel']}),
    (r'密談|交渉|取引|駆け引き|deal|casino|poker|陰謀|conspir', {'scene': ['negotiation']}),
    (r'異変|異常|怪異|anomal', {'scene': ['anomaly']}),
    (r'別れ|別離|さよなら|farewell|goodbye|弔|葬|requiem|レクイエム', {'scene': ['parting']}),
    (r'再会|reunion', {'scene': ['reunion']}),
    (r'決断|決意|覚悟|resolve|decision', {'scene': ['decision']}),
    (r'騒動|ドタバタ|ハプニング|混乱|panic|chaos', {'scene': ['incident']}),
    (r'エンディング|ending|epilogue|終幕|後日', {'scene': ['ending']}),
    (r'会話|談笑|おしゃべり|talk|chat|lounge|ラウンジ', {'scene': ['social']}),
    (r'夜会|舞踏|ワルツ|waltz|masquerade', {'setting': ['mansion']}),
    (r'館|屋敷|洋館|城|castle|mansion|manor', {'setting': ['mansion']}),
    (r'聖|教会|大聖堂|church|cathedral|pray|祈り|賛美|hymn|chapel', {'setting': ['sacred']}),
    (r'学校|学園|放課後|教室|school|campus', {'setting': ['school']}),
    (r'遺跡|洞窟|地下|迷宮|ruins|cave|dungeon|labyrinth', {'setting': ['ruins']}),
    (r'森|草原|forest|prairie|meadow|川|湖|lake|river', {'setting': ['nature']}),
    (r'宇宙|space|galaxy|cosmo|星間', {'setting': ['scifi-space']}),
    (r'サイバー|cyber|電脳|hacker|ハッカー', {'setting': ['cyber']}),
    (r'スチーム|steam|歯車|蒸気', {'setting': ['steampunk']}),
    (r'クトゥルフ|cthulhu|旧支配者|深淵|abyss|邪神|ネクロノミコン', {'setting': ['cthulhu']}),
    (r'終末|荒廃|廃墟|apocalyp|wasteland', {'setting': ['post-apocalyptic']}),
    (r'狂気|madness|insan|lunatic', {'tone': ['madness']}),
    (r'恋|love|romance|ロマンス', {'tone': ['romantic']}),
    (r'孤独|lonely|alone', {'tone': ['lonely']}),
    (r'絶望|despair', {'tone': ['despair']}),
]

# candidate shelves (never published automatically): first match on the track's non-suggested tags,
# plus scene-based candidates from any status
CANDIDATE_BY_SCENE = {'battle': 'battle', 'negotiation': 'negotiation', 'social': 'conversation',
                      'exploration': 'exploration', 'deduction': 'deduction', 'daily': 'daily', 'intro': 'intro', 'ending': 'epilogue'}
CANDIDATE_BY_TONE = [('fearful', 'horror'), ('uneasy', 'unease'), ('tense', 'tension'), ('despair', 'sad'), ('sad', 'sad'),
                     ('moving', 'moving'), ('hopeful', 'moving'), ('comical', 'comic')]

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

# ---- v0.52: OpenTracks bulk tagging ----
# Some creators tick (almost) every mood box on their OpenTracks page. The tags are really on the song's own page
# (checked 2026-11-19), but they no longer describe the song. A track counts as bulk-tagged when its own page carries
# both sides of at least BULK_MIN_PAIRS of these opposite moods. Then every OpenTracks mood / rhythm tag of that track
# becomes 'suggested' (kept as evidence, not used for search or shelf candidates), and its OpenTracks genre and
# instrument codes are not copied to musicStyles. With exactly one opposite pair, only the codes of that pair become
# 'suggested' (the page contradicts itself there; other tags stay). No cap on the number of tags is used.
OT_OPPOSED = [
    ('m01', 'm16'),  # 明るい × 暗い
    ('m02', 'm17'),  # 楽しい × 悲しい
    ('m03', 'm15'),  # 温かい × 冷たい
    ('m04', 'm20'),  # 穏やか × 激しい
    ('m27', 'm26'),  # 希望 × 絶望
    ('m09', 'm19'),  # 可愛い × 恐ろしい
    ('m23', 'm28'),  # ｺﾒﾃﾞｨｰ × ｼﾘｱｽ
]
BULK_MIN_PAIRS = 2
