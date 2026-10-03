/* CoCハウスルール表メーカー — ルールのテンプレート
 * 6版・7版・版共通を別々のデータとして持つ。
 * ルール: id / カテゴリ / 名前 / ひとこと説明 / 選択肢 / raw（ルールブック準拠の値）/ pop（よくある卓の値）/ core（最初から表に載せるか）
 * 選択肢には必ず最後に「※（変更あり）」が付く。数値つきの選択肢は label の {n} が数値に置き換わる。 */
(function (global) {
  'use strict';

  const L = (ja, en, ko) => ({ ja, en, ko });

  /* 共通の選択肢 */
  const OPT = {
    o: { sym: true, label: L('○', '○', '○'), long: L('採用', 'Used', '사용') },
    x: { sym: true, label: L('×', '×', '×'), long: L('不採用', 'Not used', '미사용') },
    m: { sym: true, label: L('※', '※', '※'), long: L('変更あり（注記を参照）', 'Modified (see note)', '변경 있음(주석 참조)') },
    on: { label: L('あり', 'Yes', '있음') },
    off: { label: L('なし', 'No', '없음') },
    raw: { label: L('ルールブック準拠', 'As written', '룰북 기준') },
    ok: { label: L('可', 'OK', '가능') },
    consult: { label: L('要相談', 'Ask first', '사전 상담') },
    ng: { label: L('不可', 'Not allowed', '불가') }
  };

  const CATS = {
    check: L('基本判定・技能', 'Checks & Skills', '판정・기능'),
    sanity: L('正気度・狂気', 'Sanity & Insanity', '이성・광기'),
    combat: L('戦闘', 'Combat', '전투'),
    damage: L('ダメージ・回復', 'Damage & Healing', '대미지・회복'),
    growth: L('成長・報酬', 'Growth & Rewards', '성장・보상'),
    creation: L('探索者作成', 'Investigator Creation', '탐사자 작성'),
    table: L('その他・卓運用', 'Other / Table', '기타・탁 운영'),
    dice: L('判定・ダイス', 'Rolls & Dice', '판정・주사위'),
    play: L('進行・ロールプレイ', 'Play & Roleplay', '진행・롤플레이'),
    char: L('探索者の扱い', 'Investigators', '탐사자 취급'),
    share: L('ログ・配信', 'Logs & Streaming', '로그・방송')
  };

  /* r(id, cat, name, hint, opts, raw, pop, core)
   * opts は OPT のキー、または { id, label, num } */
  const r = (id, cat, name, hint, opts, raw, pop, core) => ({ id, cat, name, hint, opts, raw, pop: pop === undefined ? raw : pop, core: Boolean(core) });
  const n = (id, label, def, min = 0, max = 999) => ({ id, label, num: { def, min, max } });
  const o = (id, label) => ({ id, label });

  const OX = ['o', 'x'];

  /* ---------- 6版 ---------- */
  const R6 = [
    r('cmd', 'check', L('基本判定コマンド', 'Roll command', '기본 판정 명령어'),
      L('CC＝01でクリティカル・100でファンブル、CCB＝01〜05でクリティカル・96〜100でファンブル（BCDice）', 'CC: crit on 01, fumble on 100. CCB: crit on 01–05, fumble on 96–100 (BCDice).', 'CC=01 크리티컬・100 펌블, CCB=01~05 크리티컬・96~100 펌블(BCDice)'),
      [o('cc', L('CC', 'CC', 'CC')), o('ccb', L('CCB', 'CCB', 'CCB')), o('mix', L('通常時CC・戦闘時CCB', 'CC normally, CCB in combat', '평소 CC・전투 시 CCB'))], 'ccb', 'ccb', true),
    r('special', 'check', L('スペシャル', 'Special success', '스페셜'),
      L('技能値の1/5以下で成功したときの特別な成功', 'A success at 1/5 of the skill value or less', '기능치의 1/5 이하로 성공했을 때의 특별한 성공'),
      ['o', 'x', o('impale', L('貫通のみ', 'Impale only', '관통만'))], 'o', 'o', true),
    r('fumbletable', 'check', L('ファンブル表の使用', 'Fumble table', '펌블 표 사용'),
      L('ファンブルの結果を表で決める', 'Roll on a table to decide what a fumble does', '펌블 결과를 표로 결정'),
      OX, 'x', 'x', false),

    r('sancf', 'sanity', L('正気度減少へのクリティカル・ファンブル適用', 'Crits/fumbles on Sanity rolls', '이성 판정에 크리티컬・펌블 적용'),
      L('正気度ロールのクリティカルで減少を最小、ファンブルで最大にするなど', 'e.g. a crit takes the minimum loss, a fumble the maximum', '이성 판정 크리티컬은 최소 감소, 펌블은 최대 감소 등'),
      ['on', 'off'], 'off', 'on', true),
    r('tempmad', 'sanity', L('一時的狂気の内容', 'Temporary insanity effects', '일시적 광기의 내용'),
      L('発狂の内容を表で振るか、KPが選んでもよいか', 'Whether the effect is rolled on the table or may be chosen by the KP', '광기 내용을 표로 굴릴지, KP가 골라도 되는지'),
      [o('either', L('ロールまたは選択', 'Roll or choose', '굴림 또는 선택')), o('roll', L('ロールのみ', 'Roll only', '굴림만'))], 'either', 'either', true),
    r('indef', 'sanity', L('不定の狂気', 'Indefinite insanity', '부정기 광기'), null, OX, 'o', 'o', true),
    r('insight', 'sanity', L('狂気の洞察', 'Insane insight', '광기의 통찰'), null, OX, 'o', 'o', false),
    r('mythosgrow', 'sanity', L('クトゥルフ神話技能の成長', 'Cthulhu Mythos skill growth', '크툴루 신화 기능 성장'),
      L('成長チェックでクトゥルフ神話技能を伸ばせるか', 'Whether Cthulhu Mythos can improve through skill checks', '성장 체크로 크툴루 신화 기능을 올릴 수 있는지'),
      OX, 'x', 'x', false),

    r('init', 'combat', L('行動順', 'Turn order', '행동 순서'), null,
      [o('dex', L('DEX順', 'By DEX', 'DEX 순')), o('dice', L('ダイス決定', 'Rolled', '주사위로 결정'))], 'dex', 'dex', true),
    r('atkdodge', 'combat', L('攻撃と回避', 'Attack and Dodge', '공격과 회피'),
      L('同じラウンドに攻撃と回避の両方ができるか', 'Whether you can both attack and dodge in one round', '같은 라운드에 공격과 회피를 둘 다 할 수 있는지'),
      [o('both', L('両方可能', 'Both', '둘 다 가능')), o('one', L('どちらか一方', 'One or the other', '둘 중 하나'))], 'both', 'both', true),
    r('parrydodge', 'combat', L('回避と受け流し', 'Dodge and Parry', '회피와 받아넘기기'),
      L('同じラウンドに回避と受け流しの両方ができるか', 'Whether you can both dodge and parry in one round', '같은 라운드에 회피와 받아넘기기를 둘 다 할 수 있는지'),
      [o('both', L('両方可能', 'Both', '둘 다 가능')), o('one', L('どちらか一方', 'One or the other', '둘 중 하나'))], 'both', 'both', false),
    r('dodgespot', 'combat', L('回避のスポットルール', 'Dodge spot rule', '회피 스팟 룰'), null, OX, 'x', 'x', false),
    r('impale', 'combat', L('貫通', 'Impale', '관통'),
      L('貫通武器でスペシャルが出たときにダメージを増やす', 'Extra damage when an impaling weapon gets a special success', '관통 무기로 스페셜이 나오면 대미지 증가'),
      OX, 'o', 'o', true),
    r('knockout', 'combat', L('ノックアウト攻撃', 'Knockout attack', '녹아웃 공격'),
      L('素手や鈍器で相手を気絶させる攻撃', 'Bare-handed or blunt attacks meant to knock out', '맨손이나 둔기로 상대를 기절시키는 공격'),
      OX, 'o', 'o', false),
    r('readyfire', 'combat', L('射撃準備', 'Readied firearms', '사격 준비'), null, OX, 'o', 'o', false),
    r('burst', 'combat', L('連射', 'Multiple shots / bursts', '연사'), null, OX, 'o', 'o', false),
    r('grapple', 'combat', L('組み付き（2010）', 'Grappling (2010)', '붙잡기(2010)'), null, OX, 'x', 'x', false),
    r('martial', 'combat', L('武道（2010）', 'Martial arts (2010)', '무도(2010)'), null, OX, 'x', 'x', false),

    r('aidcount', 'damage', L('手当可能回数', 'Treatment attempts', '치료 가능 횟수'),
      L('1回の負傷に対して応急手当・医学を試せる回数', 'How many times First Aid / Medicine can be tried per wound', '부상 1회에 응급처치・의학을 시도할 수 있는 횟수'),
      [o('1', L('1回', 'Once', '1회')), o('2', L('2回', 'Twice', '2회')), o('3', L('3回', '3 times', '3회')), o('inf', L('無制限', 'Unlimited', '무제한'))], '1', '1', true),
    r('aidmed', 'damage', L('応急手当と医学の組み合わせ', 'First Aid + Medicine together', '응급처치와 의학 병용'),
      L('同じ負傷に応急手当と医学の両方を使えるか', 'Whether both can be used on the same wound', '같은 부상에 응급처치와 의학을 둘 다 쓸 수 있는지'),
      OX, 'o', 'o', true),
    r('autoko', 'damage', L('自動気絶', 'Automatic unconsciousness', '자동 기절'),
      L('耐久力が一定以下になると自動で気絶する', 'Falling unconscious automatically at low HP', '내구력이 일정 이하가 되면 자동으로 기절'),
      OX, 'o', 'o', false),
    r('shock', 'damage', L('ショック', 'Shock', '쇼크'),
      L('一度に大きなダメージを受けたときのCONロール', 'A CON roll after taking heavy damage at once', '한 번에 큰 대미지를 받았을 때의 CON 판정'),
      OX, 'o', 'o', false),
    r('dying', 'damage', L('瀕死・死亡の扱い', 'Dying and death', '빈사・사망 취급'), null,
      ['raw', o('grace', L('救命の猶予あり', 'Grace period to save', '구명 유예 있음'))], 'raw', 'raw', false),

    r('growcheck', 'growth', L('技能成長チェック', 'Skill improvement checks', '기능 성장 체크'),
      L('成功した技能にチェックを付け、セッション後に成長ロール', 'Tick successful skills and roll for growth after the session', '성공한 기능에 체크하고 세션 후 성장 굴림'),
      ['raw'], 'raw', 'raw', true),
    r('growamount', 'growth', L('成長ロールの上昇量', 'Growth amount', '성장 굴림 상승량'), null,
      [o('d10', L('1D10', '1D10', '1D10'))], 'd10', 'd10', false),
    r('instant', 'growth', L('即時成長', 'Instant growth', '즉시 성장'),
      L('セッション中にその場で技能を成長させる卓ルール', 'Improving a skill on the spot during play', '세션 중 그 자리에서 기능을 성장시키는 룰'),
      [o('init', L('初期値成長', 'On success at base value', '초기값 성공 시')), o('crit', L('クリティカルで成長', 'On a critical', '크리티컬 시')), 'x'], 'x', 'init', true),
    r('interlude', 'growth', L('幕間成長（2010）', 'Interlude growth (2010)', '막간 성장(2010)'), null, OX, 'x', 'x', false),

    r('statmethod', 'creation', L('能力値の決め方', 'Generating characteristics', '능력치 결정 방법'), null,
      [o('dice', L('ダイス', 'Rolled', '주사위')), o('point', L('ポイント振り分け', 'Point buy', '포인트 분배'))], 'dice', 'dice', false),
    r('reroll', 'creation', L('能力値ダイスの振り直し', 'Rerolling characteristics', '능력치 주사위 재굴림'), null,
      [o('inf', L('無制限', 'Unlimited', '무제한')), n('each', L('全体無制限・個別{n}回', 'Full set unlimited, single stat {n}×', '전체 무제한・개별 {n}회'), 1, 0, 99), n('total', L('合計{n}回', '{n}× in total', '합계 {n}회'), 3, 0, 99), o('none', L('なし', 'None', '없음'))], 'none', 'inf', true),
    r('swap', 'creation', L('能力値の入れ替え', 'Swapping characteristics', '능력치 교환'), null, OX, 'x', 'x', true),
    r('occpts', 'creation', L('職業技能ポイント', 'Occupation skill points', '직업 기능 포인트'), null,
      [o('edu20', L('EDU×20', 'EDU×20', 'EDU×20')), o('byocc', L('職業ごとの計算式', 'Per-occupation formula', '직업별 계산식'))], 'edu20', 'edu20', false),
    r('hobpts', 'creation', L('趣味技能ポイント', 'Personal interest points', '취미 기능 포인트'), null,
      [o('int10', L('INT×10', 'INT×10', 'INT×10'))], 'int10', 'int10', false),
    r('skillcap', 'creation', L('技能上限', 'Skill cap', '기능 상한'),
      L('探索者作成時に1つの技能に振れる上限', 'Highest value one skill may start at', '탐사자 작성 시 한 기능의 상한'),
      [n('cap', L('{n}%まで', 'Up to {n}%', '{n}%까지'), 90, 1, 999), o('none', L('なし', 'None', '없음'))], 'none', 'cap', true),
    r('age', 'creation', L('年齢補正', 'Age modifiers', '나이 보정'), null, OX, 'o', 'o', false),
    r('occspec', 'creation', L('職業特記の使用', 'Occupation specials', '직업 특기 사용'), null, OX, 'o', 'o', false),
    r('traits', 'creation', L('特徴表の使用', 'Traits table', '특징표 사용'), null,
      [o('one', L('1つ', 'One', '1개')), o('two', L('2つ', 'Two', '2개')), o('none', L('なし', 'None', '없음'))], 'none', 'two', true),

    r('critticket', 'table', L('クリティカルチケット', 'Critical ticket', '크리티컬 티켓'),
      L('クリティカルで得たチケットを後の判定に使える卓ルール', 'A crit earns a ticket to spend on a later roll', '크리티컬로 얻은 티켓을 나중의 판정에 쓰는 룰'),
      OX, 'x', 'x', false)
  ];

  /* ---------- 7版 ---------- */
  const R7 = [
    r('push', 'check', L('プッシュ・ロール', 'Pushing rolls', '밀어붙이기 굴림'),
      L('失敗した判定を、やり方を変えてもう一度振る（再失敗で悪い結果）', 'Reroll a failed check with a new approach; failing again brings trouble', '실패한 판정을 방법을 바꿔 다시 굴림(재실패 시 나쁜 결과)'),
      OX, 'o', 'o', true),
    r('luckspend', 'check', L('幸運の消費', 'Spending Luck', '행운 소비'),
      L('幸運を消費して出目を下げ、判定を成功にする', 'Spend Luck points to lower a roll into a success', '행운을 소비해 굴림 값을 낮춰 성공시키기'),
      OX, 'x', 'o', true),
    r('fumble7', 'check', L('ファンブルの範囲', 'Fumble range', '펌블 범위'),
      L('ルールブックでは技能値50未満なら96〜100、50以上なら100がファンブル', 'As written: 96–100 if the skill is under 50, otherwise 100', '룰북: 기능치 50 미만은 96~100, 50 이상은 100이 펌블'),
      ['raw', o('f100', L('100のみ', '100 only', '100만')), o('f96', L('96〜100', '96–100', '96~100'))], 'raw', 'raw', false),
    r('difficulty', 'check', L('成功の難易度', 'Difficulty levels', '성공 난이도'),
      L('レギュラー／ハード／イクストリームの使い分け', 'Use of Regular / Hard / Extreme difficulty', '레귤러/하드/익스트림 구분'),
      ['raw', o('regular', L('レギュラーのみ', 'Regular only', '레귤러만'))], 'raw', 'raw', false),

    r('sancf', 'sanity', L('正気度減少へのクリティカル・ファンブル適用', 'Crits/fumbles on Sanity rolls', '이성 판정에 크리티컬・펌블 적용'),
      L('正気度ロールのクリティカルで減少を最小、ファンブルで最大にするなど', 'e.g. a crit takes the minimum loss, a fumble the maximum', '이성 판정 크리티컬은 최소 감소, 펌블은 최대 감소 등'),
      ['on', 'off'], 'off', 'on', true),
    r('tempmad', 'sanity', L('一時的狂気の内容', 'Bout of madness effects', '일시적 광기의 내용'),
      L('狂気の発作を表で振るか、KPが選んでもよいか', 'Whether the bout is rolled on the table or may be chosen by the KP', '광기 발작을 표로 굴릴지, KP가 골라도 되는지'),
      [o('either', L('ロールまたは選択', 'Roll or choose', '굴림 또는 선택')), o('roll', L('ロールのみ', 'Roll only', '굴림만'))], 'either', 'either', true),
    r('indef', 'sanity', L('不定の狂気', 'Indefinite insanity', '부정기 광기'), null, OX, 'o', 'o', true),
    r('latent', 'sanity', L('潜在狂気', 'Underlying insanity', '잠재 광기'), null, OX, 'o', 'o', false),
    r('delusion', 'sanity', L('妄想と幻覚', 'Delusions and hallucinations', '망상과 환각'), null, OX, 'o', 'o', false),
    r('phobia', 'sanity', L('恐怖症とマニア', 'Phobias and manias', '공포증과 마니아'), null, OX, 'o', 'o', false),
    r('insight', 'sanity', L('狂気の洞察', 'Insane insight', '광기의 통찰'), null, OX, 'o', 'o', false),
    r('numb', 'sanity', L('クトゥルフ神話不感症', 'Mythos hardened', '크툴루 신화 불감증'), null, OX, 'o', 'o', false),

    r('init', 'combat', L('行動順', 'Turn order', '행동 순서'), null,
      [o('dex', L('DEX順', 'By DEX', 'DEX 순')), o('dice', L('ダイス決定', 'Rolled', '주사위로 결정'))], 'dex', 'dex', true),
    r('readyfire', 'combat', L('射撃準備', 'Readied firearms', '사격 준비'),
      L('構えた銃はDEX+50として先に撃てる', 'A readied firearm acts at DEX +50', '겨눈 총은 DEX+50으로 먼저 쏠 수 있음'),
      OX, 'o', 'o', false),
    r('knockout', 'combat', L('ノックアウト攻撃', 'Knockout blows', '녹아웃 공격'), null, OX, 'o', 'o', false),
    r('burst', 'combat', L('連射', 'Multiple shots / bursts', '연사'), null, OX, 'o', 'o', false),
    r('impale', 'combat', L('貫通', 'Impale', '관통'),
      L('貫通武器でイクストリーム成功したときのダメージ増加', 'Extra damage on an Extreme success with an impaling weapon', '관통 무기로 익스트림 성공 시 대미지 증가'),
      OX, 'o', 'o', true),
    r('chase', 'combat', L('追跡（チェイス）', 'Chases', '추적(체이스)'), null, OX, 'o', 'o', false),

    r('aidcount', 'damage', L('手当可能回数', 'Treatment attempts', '치료 가능 횟수'),
      L('1回の負傷に対して応急手当・医学を試せる回数', 'How many times First Aid / Medicine can be tried per wound', '부상 1회에 응급처치・의학을 시도할 수 있는 횟수'),
      [o('1', L('1回', 'Once', '1회')), o('2', L('2回', 'Twice', '2회')), o('3', L('3回', '3 times', '3회')), o('inf', L('無制限', 'Unlimited', '무제한'))], '1', '1', true),
    r('aidmed', 'damage', L('応急手当と医学の組み合わせ', 'First Aid + Medicine together', '응급처치와 의학 병용'),
      L('同じ負傷に応急手当と医学の両方を使えるか', 'Whether both can be used on the same wound', '같은 부상에 응급처치와 의학을 둘 다 쓸 수 있는지'),
      OX, 'o', 'o', true),
    r('majorwound', 'damage', L('重傷', 'Major wounds', '중상'),
      L('一度に耐久力の半分以上のダメージで重傷になる', 'Taking half your HP or more at once is a major wound', '한 번에 내구력 절반 이상의 대미지를 받으면 중상'),
      OX, 'o', 'o', false),
    r('luckdeath', 'damage', L('幸運による延命', 'Luck to avoid death', '행운으로 연명'), null, OX, 'x', 'x', false),

    r('growcheck', 'growth', L('技能成長チェック', 'Skill improvement checks', '기능 성장 체크'),
      L('成功した技能にチェックを付け、成長フェイズで成長ロール', 'Tick successful skills and roll during the development phase', '성공한 기능에 체크하고 성장 페이즈에 성장 굴림'),
      ['raw'], 'raw', 'raw', true),
    r('growamount', 'growth', L('成長ロールの上昇量', 'Growth amount', '성장 굴림 상승량'), null,
      [o('d10', L('1D10', '1D10', '1D10'))], 'd10', 'd10', false),
    r('instant', 'growth', L('即時成長', 'Instant growth', '즉시 성장'),
      L('セッション中にその場で技能を成長させる卓ルール', 'Improving a skill on the spot during play', '세션 중 그 자리에서 기능을 성장시키는 룰'),
      [o('init', L('初期値成長', 'On success at base value', '초기값 성공 시')), o('crit', L('クリティカルで成長', 'On a critical', '크리티컬 시')), 'x'], 'x', 'x', true),
    r('luckrecover', 'growth', L('幸運の回復', 'Recovering Luck', '행운 회복'),
      L('成長フェイズで幸運を回復できるか', 'Whether Luck recovers in the development phase', '성장 페이즈에 행운을 회복할 수 있는지'),
      ['o', 'x', o('used', L('使用時のみ', 'Only if spent', '사용했을 때만'))], 'o', 'used', false),

    r('statmethod', 'creation', L('能力値の決め方', 'Generating characteristics', '능력치 결정 방법'), null,
      [o('dice', L('ダイス', 'Rolled', '주사위')), o('point', L('ポイント振り分け', 'Point buy', '포인트 분배'))], 'dice', 'dice', false),
    r('reroll', 'creation', L('能力値ダイスの振り直し', 'Rerolling characteristics', '능력치 주사위 재굴림'), null,
      [o('inf', L('無制限', 'Unlimited', '무제한')), n('each', L('全体無制限・個別{n}回', 'Full set unlimited, single stat {n}×', '전체 무제한・개별 {n}회'), 1, 0, 99), n('total', L('合計{n}回', '{n}× in total', '합계 {n}회'), 3, 0, 99), o('none', L('なし', 'None', '없음'))], 'none', 'inf', true),
    r('swap', 'creation', L('能力値の入れ替え', 'Swapping characteristics', '능력치 교환'), null, OX, 'x', 'x', true),
    r('exceptional', 'creation', L('真に優れた探索者', 'Truly exceptional investigators', '진정으로 뛰어난 탐사자'), null, OX, 'x', 'x', false),
    r('occpts', 'creation', L('職業技能ポイント', 'Occupation skill points', '직업 기능 포인트'), null,
      [o('byocc', L('職業ごとの計算式', 'Per-occupation formula', '직업별 계산식'))], 'byocc', 'byocc', false),
    r('hobpts', 'creation', L('興味技能ポイント', 'Personal interest points', '흥미 기능 포인트'), null,
      [o('int2', L('INT×2', 'INT×2', 'INT×2'))], 'int2', 'int2', false),
    r('skillcap', 'creation', L('技能上限', 'Skill cap', '기능 상한'),
      L('探索者作成時に1つの技能に振れる上限', 'Highest value one skill may start at', '탐사자 작성 시 한 기능의 상한'),
      [n('cap', L('{n}%まで', 'Up to {n}%', '{n}%까지'), 80, 1, 999), o('none', L('なし', 'None', '없음'))], 'none', 'cap', true),
    r('age', 'creation', L('年齢補正', 'Age modifiers', '나이 보정'), null, OX, 'o', 'o', false),
    r('exppack', 'creation', L('経験パッケージの使用', 'Experience packages', '경험 패키지 사용'), null, OX, 'x', 'x', false),
    r('talent', 'creation', L('異才のエントリーの使用', 'Talent entries', '이재 항목 사용'), null,
      [o('one', L('1つ', 'One', '1개')), o('two', L('2つ', 'Two', '2개')), o('none', L('なし', 'None', '없음'))], 'none', 'none', false)
  ];

  /* ---------- 版共通 ---------- */
  const RC = [
    r('secret', 'dice', L('シークレットダイス', 'Secret rolls', '시크릿 다이스'),
      L('結果を伏せたい判定をどう振るか', 'How rolls with hidden results are made', '결과를 숨기고 싶은 판정을 어떻게 굴릴지'),
      [o('kp', L('KPが振る', 'KP rolls', 'KP가 굴림')), o('pl', L('PLが振り、結果は伏せる', 'Player rolls, result hidden', 'PL이 굴리고 결과는 숨김')), o('none', L('使わない', 'Not used', '사용 안 함'))], 'kp', 'kp', true),
    r('retry', 'dice', L('同じ判定の振り直し', 'Retrying the same check', '같은 판정 재굴림'), null,
      [o('no', L('不可', 'Not allowed', '불가')), o('change', L('状況が変われば可', 'OK if the situation changes', '상황이 바뀌면 가능'))], 'no', 'no', true),
    r('combine', 'dice', L('技能の組み合わせ判定', 'Combined skill rolls', '기능 조합 판정'),
      L('1回のロールで2つの技能を同時に判定する', 'One roll checked against two skills at once', '한 번의 굴림으로 두 기능을 동시에 판정'),
      OX, 'x', 'x', false),
    r('timing', 'dice', L('判定のタイミング', 'When to roll', '판정 타이밍'), null,
      [o('kp', L('KPの指示で振る', 'When the KP asks', 'KP 지시로 굴림')), o('pl', L('PLから提案してよい', 'Players may suggest rolls', 'PL이 제안해도 됨'))], 'pl', 'pl', false),
    r('kpdice', 'dice', L('KPのダイス公開', 'KP rolls in the open', 'KP 주사위 공개'), null,
      [o('open', L('公開', 'Open', '공개')), o('hidden', L('非公開', 'Hidden', '비공개')), o('case', L('場合による', 'Depends', '경우에 따라'))], 'case', 'case', false),

    r('info', 'play', L('PL間の情報共有', 'Sharing information between players', 'PL 간 정보 공유'), null,
      [o('free', L('自由', 'Free', '자유')), o('meet', L('探索者同士が会ってから', 'Once the investigators meet', '탐사자끼리 만난 뒤'))], 'free', 'free', true),
    r('meta', 'play', L('メタ発言', 'Meta talk', '메타 발언'), null,
      ['ok', o('light', L('控えめに', 'Keep it light', '적당히')), 'ng'], 'light', 'light', false),
    r('pvp', 'play', L('PvP（探索者同士の対立）', 'PvP (investigator vs investigator)', 'PvP(탐사자끼리의 대립)'), null,
      ['ok', 'consult', 'ng'], 'consult', 'consult', false),

    r('continuing', 'char', L('参加できる探索者', 'Investigators allowed', '참가 가능한 탐사자'), null,
      [o('both', L('新規・継続どちらも可', 'New or continuing', '신규・계속 모두 가능')), o('new', L('新規のみ', 'New only', '신규만')), o('cont', L('継続のみ', 'Continuing only', '계속만'))], 'both', 'both', true),
    r('lost', 'char', L('探索者のロスト', 'Investigator loss', '탐사자 로스트'), null,
      ['on', o('rescue', L('救済あり', 'With a rescue option', '구제 있음')), 'off'], 'on', 'on', true),
    r('carry', 'char', L('他シナリオからの持ち込み', 'Items/skills from other scenarios', '다른 시나리오에서 가져오기'),
      L('AF（アーティファクト）や特殊な技能・呪文など', 'Artifacts, special skills, spells and so on', 'AF(아티팩트)나 특수 기능・주문 등'),
      ['ok', 'consult', 'ng'], 'consult', 'consult', false),

    r('stream', 'share', L('ログ・配信の公開', 'Publishing logs / streaming', '로그・방송 공개'), null,
      ['ok', 'consult', 'ng'], 'consult', 'consult', false),
    r('spoiler', 'share', L('通過後のネタバレ', 'Spoilers after play', '통과 후 스포일러'), null,
      [o('hide', L('伏せて話す', 'Keep them hidden', '숨겨서 이야기')), o('free', L('自由', 'Free', '자유'))], 'hide', 'hide', false)
  ];

  const SECTIONS = [
    { id: '6', cats: ['check', 'sanity', 'combat', 'damage', 'growth', 'creation', 'table'], rules: R6,
      name: L('6版', '6th Edition', '6판'), full: L('クトゥルフ神話TRPG（6版）', 'Call of Cthulhu 6th Edition', '크툴루의 부름 6판') },
    { id: '7', cats: ['check', 'sanity', 'combat', 'damage', 'growth', 'creation', 'table'], rules: R7,
      name: L('7版', '7th Edition', '7판'), full: L('新クトゥルフ神話TRPG（7版）', 'Call of Cthulhu 7th Edition', '크툴루의 부름 7판') },
    { id: 'common', cats: ['dice', 'play', 'char', 'share'], rules: RC,
      name: L('版共通', 'Common', '공통'), full: L('版共通ハウスルール', 'Common House Rules', '공통 하우스 룰') }
  ];

  /* 選択肢を { id, label, long?, sym?, num? } の形に揃え、最後に ※ を足す */
  SECTIONS.forEach(sec => sec.rules.forEach(rule => {
    rule.opts = rule.opts.map(item => (typeof item === 'string' ? { id: item, ...OPT[item] } : item));
    if (!rule.opts.some(op => op.id === 'm')) rule.opts.push({ id: 'm', ...OPT.m });
  }));

  global.HRT_RULES = { OPT, CATS, SECTIONS, L };
})(window);
