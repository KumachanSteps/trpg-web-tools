/* TRPG背景サジェスト — タグ辞書
 * 各タグ: [id, 分類, 日本語名, 英語名, 韓国語名, 本文用の語句, ファイル名だけで使う語句, ヒント]
 * ・本文用の語句は「|」区切り。本文とファイル名・フォルダ名の両方に使う。
 * ・ファイル名だけで使う語句は、本文では誤検出が多い一文字語（山・川など）やローマ字。
 * ・ヒントは色解析タグ（tone.*）。画像にそのタグがあれば部分一致として少し加点する。
 * ラテン文字の語句は単語の区切りで照合し、日本語・韓国語は部分一致で照合する。 */
(function (global) {
  'use strict';

  const CATEGORIES = [
    { id: 'indoor', weight: 1.5, ja: '屋内', en: 'Indoor', ko: '실내' },
    { id: 'outdoor', weight: 1.5, ja: '屋外', en: 'Outdoor', ko: '실외' },
    { id: 'time', weight: 1.0, ja: '時間帯', en: 'Time', ko: '시간대' },
    { id: 'weather', weight: 1.0, ja: '天気・季節', en: 'Weather & season', ko: '날씨·계절' },
    { id: 'mood', weight: 0.8, ja: '雰囲気', en: 'Mood', ko: '분위기' },
    { id: 'style', weight: 0.8, ja: '時代・様式', en: 'Era & style', ko: '시대·양식' },
    { id: 'tone', weight: 0.6, ja: '色・明るさ', en: 'Color & brightness', ko: '색·밝기' },
    { id: 'custom', weight: 1.2, ja: 'マイタグ', en: 'My tags', ko: '내 태그' }
  ];

  const RAW = [
    // ---- 屋内 ----
    ['in.mansion', 'indoor', '洋館', 'Mansion', '저택', '洋館|屋敷|邸宅|豪邸|mansion|manor|저택|대저택', '館|yakata|yashiki|youkan', ['tone.dark']],
    ['in.room', 'indoor', '部屋', 'Room', '방', '部屋|自室|個室|室内|room|방안|방 안|자기 방', 'heya|room', []],
    ['in.bedroom', 'indoor', '寝室', 'Bedroom', '침실', '寝室|ベッド|寝台|bedroom|침실|침대', 'shinshitsu|bed', []],
    ['in.living', 'indoor', 'リビング', 'Living room', '거실', 'リビング|居間|応接間|客間|living room|parlor|거실|응접실', 'living|ima', []],
    ['in.japaneseRoom', 'indoor', '和室', 'Japanese room', '다다미방', '和室|座敷|畳|襖|障子|tatami|다다미', 'washitsu|zashiki', []],
    ['in.kitchen', 'indoor', '台所', 'Kitchen', '부엌', '台所|キッチン|厨房|kitchen|부엌|주방', 'daidokoro', []],
    ['in.bathroom', 'indoor', '浴室・洗面所', 'Bathroom', '욕실', '浴室|風呂|バスルーム|洗面所|トイレ|bathroom|toilet|욕실|화장실', 'furo|bath', []],
    ['in.hallway', 'indoor', '廊下', 'Hallway', '복도', '廊下|通路|回廊|corridor|hallway|복도', 'rouka', ['tone.dark']],
    ['in.stairs', 'indoor', '階段', 'Stairs', '계단', '階段|螺旋階段|stairs|staircase|계단', 'kaidan', []],
    ['in.basement', 'indoor', '地下室', 'Basement', '지하실', '地下室|地下|地下牢|basement|cellar|지하실|지하', 'chika', ['tone.dark']],
    ['in.attic', 'indoor', '屋根裏', 'Attic', '다락방', '屋根裏|天井裏|attic|loft|다락방|다락', 'yaneura', []],
    ['in.library', 'indoor', '書斎・図書館', 'Study & library', '서재·도서관', '書斎|図書館|図書室|書庫|本棚|study|library|bookshelf|서재|도서관|서고', 'shosai|toshokan', []],
    ['in.school', 'indoor', '学校・教室', 'School & classroom', '학교·교실', '学校|教室|校舎|音楽室|理科室|保健室|職員室|部室|school|classroom|학교|교실', 'gakkou|kyoushitsu', []],
    ['in.hospital', 'indoor', '病院', 'Hospital', '병원', '病院|病室|診察室|手術室|医院|ナースステーション|hospital|clinic|ward|병원|병실|수술실', 'byouin|byoin', []],
    ['in.office', 'indoor', 'オフィス', 'Office', '사무실', 'オフィス|事務所|会社|会議室|探偵事務所|office|사무실|회사|회의실', 'jimusho', []],
    ['in.cafe', 'indoor', '喫茶店・カフェ', 'Cafe', '카페', '喫茶店|カフェ|喫茶|cafe|coffee shop|카페|찻집', 'kissa', []],
    ['in.bar', 'indoor', 'バー・酒場', 'Bar & tavern', '바·술집', '酒場|居酒屋|パブ|バーカウンター|バーテン|bar|pub|tavern|술집|주점', 'sakaba|izakaya', ['tone.dark']],
    ['in.restaurant', 'indoor', 'レストラン・食堂', 'Restaurant', '레스토랑', 'レストラン|食堂|ダイニング|restaurant|dining|레스토랑|식당', 'shokudou', []],
    ['in.shop', 'indoor', 'お店', 'Shop', '가게', '商店|店内|お店|骨董品店|雑貨屋|本屋|古本屋|コンビニ|shop|store|가게|상점|편의점', 'mise', []],
    ['in.hotel', 'indoor', 'ホテル・旅館', 'Hotel & inn', '호텔·여관', 'ホテル|旅館|宿屋|宿泊|客室|ロビー|hotel|inn|lobby|호텔|여관|로비', 'ryokan', []],
    ['in.apartment', 'indoor', 'アパート・マンション', 'Apartment', '아파트', 'アパート|マンション|団地|apartment|아파트|원룸', 'apart', []],
    ['in.church', 'indoor', '教会', 'Church', '교회', '教会|礼拝堂|聖堂|大聖堂|church|chapel|cathedral|교회|예배당|성당', 'kyoukai', []],
    ['in.museum', 'indoor', '博物館・美術館', 'Museum', '박물관·미술관', '博物館|美術館|展示室|ギャラリー|museum|gallery|박물관|미술관', 'hakubutsukan|bijutsukan', []],
    ['in.lab', 'indoor', '研究所・実験室', 'Laboratory', '연구소', '研究所|研究室|実験室|laboratory|lab|연구소|연구실|실험실', 'kenkyuu', []],
    ['in.prison', 'indoor', '牢屋・監獄', 'Prison', '감옥', '牢屋|牢獄|監獄|独房|刑務所|檻|prison|jail|cell|감옥|감방|교도소', 'rouya', ['tone.dark']],
    ['in.police', 'indoor', '警察署', 'Police station', '경찰서', '警察署|交番|取調室|police station|경찰서|파출소', 'keisatsu', []],
    ['in.warehouse', 'indoor', '倉庫・工場', 'Warehouse & factory', '창고·공장', '倉庫|物置|工場|プラント|warehouse|factory|storehouse|창고|공장', 'souko|koujou', []],
    ['in.theater', 'indoor', '劇場・ホール', 'Theater & hall', '극장·홀', '劇場|ホール|舞台上|映画館|theater|theatre|stage|cinema|극장|무대|영화관', 'gekijou', []],
    ['in.train', 'indoor', '電車・列車', 'Train', '열차', '電車|列車|車内|車両|寝台列車|新幹線|train|carriage|열차|전철|기차', 'densha|ressha', []],
    ['in.car', 'indoor', '車内', 'Car interior', '차 안', '車内|車中|運転席|助手席|バス停|バスの中|タクシー|car|bus|taxi|차 안|버스|택시', 'kuruma', []],
    ['in.ship', 'indoor', '船内', 'Ship', '선내', '船|船内|客船|甲板|船室|ship|boat|cabin|선실|갑판|여객선', 'fune', []],
    ['in.castle', 'indoor', '城・宮殿', 'Castle & palace', '성·궁전', '城|宮殿|王宮|玉座|謁見の間|castle|palace|throne|성벽|고성|궁전|왕궁|옥좌', 'shiro', []],
    ['in.station', 'indoor', '駅', 'Station', '역', '駅|駅のホーム|改札|地下鉄|station|platform|subway|기차역|지하철역|승강장', 'eki', []],

    // ---- 屋外 ----
    ['out.city', 'outdoor', '街・都市', 'City', '도시', '街|都市|繁華街|商店街|都会|市街|ビル街|city|town|downtown|도시|번화가|시내|거리', 'machi|toshi', []],
    ['out.street', 'outdoor', '路地・道', 'Street & alley', '골목·길', '路地|路地裏|裏路地|道路|夜道|小道|交差点|歩道|alley|street|road|골목|도로|길가', 'roji|michi', []],
    ['out.residential', 'outdoor', '住宅街', 'Residential area', '주택가', '住宅街|住宅地|家の前|玄関先|neighborhood|suburb|주택가|동네', 'juutaku', []],
    ['out.park', 'outdoor', '公園', 'Park', '공원', '公園|広場|遊具|ベンチ|park|plaza|공원|광장', 'kouen', []],
    ['out.garden', 'outdoor', '庭・庭園', 'Garden', '정원', '庭で|庭に|庭の|庭園|中庭|裏庭|花畑|花園|garden|courtyard|정원|마당|꽃밭', '庭|niwa', ['tone.green']],
    ['out.forest', 'outdoor', '森・林', 'Forest', '숲', '森の|森へ|森に|森で|森林|樹海|雑木林|竹林|林の中|林道|forest|woods|jungle|숲|삼림|밀림', '森|林|mori|hayashi', ['tone.green']],
    ['out.mountain', 'outdoor', '山', 'Mountain', '산', '山中|山道|山奥|山頂|山小屋|登山|山の|峠|雪山|mountain|산속|산길|산꼭대기|등산', '山|yama', []],
    ['out.sea', 'outdoor', '海・浜辺', 'Sea & beach', '바다·해변', '海|浜辺|砂浜|海辺|海岸|海沿い|波打ち際|sea|ocean|beach|shore|coast|바다|해변|해안|모래사장', 'umi', ['tone.blue']],
    ['out.river', 'outdoor', '川・水辺', 'River', '강·물가', '川辺|川沿い|河原|河川|川の|川岸|小川|river|stream|riverside|강가|강변|개울', '川|kawa', ['tone.blue']],
    ['out.lake', 'outdoor', '湖・池', 'Lake & pond', '호수·연못', '湖|湖畔|池の|沼|泉|lake|pond|swamp|호수|연못|늪', '池|ike', ['tone.blue']],
    ['out.field', 'outdoor', '草原・野原', 'Grassland', '초원', '草原|野原|平原|丘|荒野|meadow|grassland|field|hill|초원|들판|언덕|황야', 'sougen', ['tone.green']],
    ['out.farm', 'outdoor', '田畑・農村', 'Farmland', '논밭', '田んぼ|畑|田園|農村|農場|水田|farm|rice field|논밭|밭|농촌', 'tanbo|hatake', ['tone.green']],
    ['out.village', 'outdoor', '村・集落', 'Village', '마을', '村の|村へ|村に|村で|村人|集落|寒村|田舎|山村|漁村|village|hamlet|마을|시골|촌락', '村|mura|inaka', []],
    ['out.desert', 'outdoor', '砂漠', 'Desert', '사막', '砂漠|砂丘|desert|dune|사막|모래언덕', 'sabaku', ['tone.orange']],
    ['out.ruins', 'outdoor', '廃墟・遺跡', 'Ruins', '폐허·유적', '廃墟|遺跡|廃屋|廃村|廃病院|廃校|廃ビル|廃工場|ruins|abandoned|derelict|폐허|유적|폐가|폐건물', 'haikyo|iseki', ['tone.dark']],
    ['out.graveyard', 'outdoor', '墓地', 'Graveyard', '묘지', '墓地|墓場|霊園|墓石|お墓|graveyard|cemetery|tomb|묘지|공동묘지|무덤', 'bochi|haka', ['tone.dark']],
    ['out.shrine', 'outdoor', '神社・寺', 'Shrine & temple', '신사·절', '神社|鳥居|境内|祠|寺院|お寺|寺の|山寺|本堂|shrine|temple|torii|신사|사찰|산사|도리이', '寺|jinja|otera|tera', []],
    ['out.rooftop', 'outdoor', '屋上', 'Rooftop', '옥상', '屋上|rooftop|옥상', 'okujou', []],
    ['out.bridge', 'outdoor', '橋', 'Bridge', '다리', '橋の|橋を|橋で|鉄橋|吊り橋|陸橋|歩道橋|bridge|다리 위|철교', '橋|hashi', []],
    ['out.cave', 'outdoor', '洞窟', 'Cave', '동굴', '洞窟|洞穴|鍾乳洞|坑道|cave|cavern|동굴|동굴 속|갱도', 'doukutsu', ['tone.dark']],
    ['out.tunnel', 'outdoor', 'トンネル', 'Tunnel', '터널', 'トンネル|地下道|下水道|tunnel|sewer|터널|지하도|하수도', 'tunnel', ['tone.dark']],
    ['out.port', 'outdoor', '港', 'Harbor', '항구', '港|埠頭|桟橋|波止場|harbor|harbour|port|pier|dock|항구|부두|선착장', 'minato', ['tone.blue']],
    ['out.island', 'outdoor', '島', 'Island', '섬', '島|孤島|無人島|離島|island|섬|무인도|외딴섬', 'shima', []],
    ['out.schoolyard', 'outdoor', '校庭', 'Schoolyard', '운동장', '校庭|グラウンド|校門|運動場|schoolyard|playground|운동장|교문', 'koutei', []],
    ['out.sky', 'outdoor', '空', 'Sky', '하늘', '青空|夜空|星空|曇り空|空を見上げ|大空|上空|sky|하늘|밤하늘|별하늘', '空|sora', ['tone.blue']],
    ['out.space', 'outdoor', '宇宙', 'Space', '우주', '宇宙|星々|銀河|宇宙船|惑星|space|galaxy|planet|spaceship|우주|은하|행성', 'uchuu', ['tone.dark']],
    ['out.cliff', 'outdoor', '崖', 'Cliff', '절벽', '崖|断崖|絶壁|cliff|절벽|벼랑', 'gake', []],

    // ---- 時間帯 ----
    ['time.morning', 'time', '朝', 'Morning', '아침', '朝|早朝|夜明け|明け方|朝日|morning|dawn|sunrise|아침|새벽|일출', 'asa', ['tone.bright']],
    ['time.day', 'time', '昼', 'Daytime', '낮', '昼|昼間|日中|正午|真昼|daytime|noon|afternoon|낮|대낮|정오|오후', 'hiru', ['tone.bright']],
    ['time.evening', 'time', '夕方', 'Evening', '저녁', '夕方|夕暮れ|夕焼け|黄昏|日没|夕日|evening|dusk|sunset|twilight|저녁|해질녘|노을|황혼', 'yuugata|yuuyake', ['tone.orange']],
    ['time.night', 'time', '夜', 'Night', '밤', '夜|深夜|真夜中|夜中|今夜|夜更け|月明かり|night|midnight|moonlight|밤|심야|한밤중|달빛', 'yoru|yakei', ['tone.dark', 'tone.blue']],

    // ---- 天気・季節 ----
    ['wx.rain', 'weather', '雨', 'Rain', '비', '雨|雨音|大雨|小雨|豪雨|梅雨|rain|rainy|drizzle|비가|빗소리|폭우|장마', 'ame', []],
    ['wx.snow', 'weather', '雪', 'Snow', '눈', '雪|吹雪|雪原|雪景色|積雪|snow|blizzard|snowy|눈보라|설원|폭설', 'yuki', ['tone.bright']],
    ['wx.fog', 'weather', '霧', 'Fog', '안개', '霧|濃霧|靄|霞|fog|mist|haze|안개|짙은 안개', 'kiri', ['tone.mono']],
    ['wx.storm', 'weather', '嵐・雷', 'Storm', '폭풍', '嵐|雷|稲妻|落雷|暴風|台風|storm|thunder|lightning|typhoon|폭풍|천둥|번개|태풍', 'arashi|kaminari', ['tone.dark']],
    ['wx.cloudy', 'weather', '曇り', 'Cloudy', '흐림', '曇り|曇天|どんより|cloudy|overcast|흐린|먹구름', 'kumori', ['tone.mono']],
    ['wx.spring', 'weather', '春・桜', 'Spring', '봄', '春|桜|花見|春風|spring|cherry blossom|sakura|봄|벚꽃', 'haru|sakura', ['tone.pink']],
    ['wx.summer', 'weather', '夏', 'Summer', '여름', '夏|真夏|夏休み|蝉|向日葵|summer|여름|한여름|매미', 'natsu', ['tone.bright']],
    ['wx.autumn', 'weather', '秋・紅葉', 'Autumn', '가을', '秋|紅葉|落ち葉|autumn|fall foliage|가을|단풍|낙엽', 'aki|kouyou', ['tone.orange']],
    ['wx.winter', 'weather', '冬', 'Winter', '겨울', '冬|真冬|凍える|winter|겨울|한겨울', 'fuyu', ['tone.bright']],

    // ---- 雰囲気 ----
    ['mood.horror', 'mood', 'ホラー・不気味', 'Horror & eerie', '호러·으스스', '恐怖|不気味|怪異|怪談|心霊|幽霊|呪い|悪夢|ホラー|horror|eerie|creepy|haunted|ghost|curse|nightmare|공포|섬뜩|유령|저주|악몽', 'horror|kowai', ['tone.dark']],
    ['mood.blood', 'mood', '血・惨劇', 'Blood & gore', '피·참극', '血|血痕|血溜まり|惨劇|死体|遺体|殺人|惨殺|blood|corpse|murder|gore|피가|피를|핏자국|피투성이|혈흔|시체|살인|참극', 'chi|blood', ['tone.red']],
    ['mood.cosmic', 'mood', '神話的恐怖', 'Cosmic horror', '코즈믹 호러', '神話生物|邪神|旧支配者|冒涜|狂気|名状しがたい|触手|深きもの|cthulhu|eldritch|cosmic horror|madness|tentacle|사신|광기|촉수|크툴루', 'cthulhu|jashin', ['tone.dark', 'tone.green']],
    ['mood.ritual', 'mood', '儀式・祭壇', 'Ritual & altar', '의식·제단', '儀式|祭壇|生贄|魔法陣|召喚|教団|カルト|ritual|altar|sacrifice|summoning|cult|의식|제단|제물|마법진|소환|교단', 'gishiki|saidan', ['tone.red', 'tone.dark']],
    ['mood.calm', 'mood', '日常・穏やか', 'Everyday & calm', '일상·평온', '日常|穏やか|平和|のどか|ほのぼの|団欒|休日|peaceful|calm|everyday|cozy|일상|평화|평온|한가로운', 'nichijou', ['tone.bright']],
    ['mood.sad', 'mood', '切ない・寂しい', 'Sad & lonely', '쓸쓸함', '寂しい|切ない|悲しい|孤独|別れ|喪失|追憶|lonely|sad|melancholy|farewell|쓸쓸|슬픈|외로운|이별', 'sabishii', ['tone.blue']],
    ['mood.fantasy', 'mood', '幻想的', 'Dreamlike', '환상적', '幻想|神秘|夢の中|夢幻|妖精|不思議な|dreamlike|mystical|fairy|ethereal|환상|신비|꿈속|요정', 'gensou|yume', ['tone.purple']],
    ['mood.battle', 'mood', '戦闘・緊迫', 'Battle & tension', '전투·긴박', '戦闘|戦い|決戦|襲撃|銃撃|追跡|逃走|緊迫|battle|fight|combat|chase|ambush|전투|싸움|결전|추격|습격', 'sentou|battle', ['tone.red']],
    ['mood.festival', 'mood', 'お祭り', 'Festival', '축제', '祭り|お祭り|縁日|屋台|花火|パーティー|宴|festival|fireworks|party|축제|불꽃놀이|파티|연회', 'matsuri|hanabi', ['tone.orange']],
    ['mood.romance', 'mood', 'ロマンチック', 'Romantic', '로맨틱', 'ロマンチック|デート|告白|恋|romantic|confession|로맨틱|데이트|고백|사랑', 'date', ['tone.pink']],
    ['mood.sacred', 'mood', '神聖', 'Sacred', '신성', '神聖|聖域|祈り|天使|奇跡|holy|sacred|sanctuary|angel|신성|성역|기도|천사', 'shinsei', ['tone.bright']],

    // ---- 時代・様式 ----
    ['style.japanese', 'style', '和風', 'Japanese style', '일본풍', '和風|日本家屋|古民家|武家屋敷|着物|japanese style|일본풍|일본식', 'wafuu|kominka', []],
    ['style.western', 'style', '洋風', 'Western style', '서양풍', '洋風|洋室|西洋|ゴシック|ヴィクトリア|western|gothic|victorian|서양풍|고딕|빅토리아', 'youfuu|gothic', []],
    ['style.modern', 'style', '現代', 'Modern', '현대', '現代|現代日本|スマホ|スマートフォン|modern|contemporary|smartphone|현대|스마트폰', 'gendai|modern', []],
    ['style.retro', 'style', 'レトロ（大正・昭和）', 'Retro', '레트로', 'レトロ|大正|昭和|明治|1920年代|禁酒法|retro|1920s|vintage|레트로|다이쇼|쇼와', 'retro|taisho|showa', []],
    ['style.scifi', 'style', 'SF・近未来', 'Sci-fi', 'SF·근미래', 'SF|近未来|サイバー|サイバーパンク|宇宙ステーション|アンドロイド|ロボット|sci-fi|cyberpunk|futuristic|android|robot|근미래|사이버펑크|로봇', 'scifi|cyber', ['tone.blue']],
    ['style.fantasy', 'style', 'ファンタジー', 'Fantasy', '판타지', 'ファンタジー|魔法|魔術|ドラゴン|騎士|魔王|ダンジョン|fantasy|magic|dragon|knight|dungeon|판타지|마법|드래곤|던전', 'fantasy|mahou', []],
    ['style.chinese', 'style', '中華', 'Chinese style', '중화풍', '中華|中国|中華街|功夫|chinese|chinatown|중화|중국풍|차이나타운', 'chuuka|china', ['tone.red']],

    // ---- 色・明るさ（色解析でも自動で付く） ----
    ['tone.dark', 'tone', '暗い', 'Dark', '어두움', '暗い|暗闇|闇|薄暗い|真っ暗|dark|darkness|gloomy|어둠|어두운|캄캄', 'dark|kurai', []],
    ['tone.bright', 'tone', '明るい', 'Bright', '밝음', '明るい|眩しい|日差し|陽光|bright|sunny|sunlight|밝은|눈부신|햇살', 'bright|akarui', []],
    ['tone.red', 'tone', '赤', 'Red', '빨강', '赤い|真っ赤|深紅|red|crimson|scarlet|붉은|빨간|새빨간', 'red|aka', []],
    ['tone.orange', 'tone', '橙・茜色', 'Orange', '주황', '茜色|橙色|オレンジ色|orange|amber|주황|노을빛', 'orange', []],
    ['tone.yellow', 'tone', '黄', 'Yellow', '노랑', '黄色い|金色|黄金|yellow|golden|노란|금빛|황금', 'yellow|kiiro', []],
    ['tone.green', 'tone', '緑', 'Green', '초록', '緑|緑色|新緑|green|초록|녹색|푸른 잎', 'green|midori', []],
    ['tone.blue', 'tone', '青', 'Blue', '파랑', '青い|蒼い|紺|藍色|blue|azure|파란|푸른|남색', 'blue|ao', []],
    ['tone.purple', 'tone', '紫', 'Purple', '보라', '紫|紫色|すみれ色|purple|violet|보라|보랏빛', 'purple|murasaki', []],
    ['tone.pink', 'tone', 'ピンク', 'Pink', '분홍', 'ピンク|桃色|桜色|pink|분홍|핑크|연분홍', 'pink', []],
    ['tone.mono', 'tone', 'モノクロ・くすみ', 'Monochrome & muted', '흑백·탁함', 'モノクロ|白黒|灰色|灰色の|セピア|monochrome|grayscale|sepia|gray|흑백|회색|세피아', 'mono|gray|grey', []]
  ];

  const TAGS = RAW.map(([id, cat, ja, en, ko, words, fileWords, hints]) => ({
    id,
    cat,
    label: { ja, en, ko },
    words: words.split('|').filter(Boolean),
    fileWords: fileWords ? fileWords.split('|').filter(Boolean) : [],
    hints: hints || []
  }));

  global.HaikeiVocab = { CATEGORIES, TAGS };
})(window);
