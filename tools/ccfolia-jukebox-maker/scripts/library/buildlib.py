# python3 -I buildlib.py <work dir> <tool dir> [<report dir>]
#  -> <tool dir>/js/library-data.js, <work dir>/libreport.json, and (with <report dir>) the review CSVs + migration report
import json, sys, re, os, csv, unicodedata, urllib.parse
from collections import Counter, OrderedDict
sys.path.insert(0, sys.argv[1])
from libmap import *  # noqa

S, TOOL = sys.argv[1], sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else None
cat = json.load(open(f'{S}/catalog.json', encoding='utf8'))
ot = json.load(open(f'{S}/otout/ot.json', encoding='utf8'))
ptmap = {}
for line in open(f'{S}/pt/tagmap.tsv', encoding='utf8'):
    p = line.rstrip('\n').split('\t')
    if len(p) >= 3 and re.fullmatch(r'[\w-]{11}', p[2] or ''):
        ptmap.setdefault(p[2], set()).add(urllib.parse.unquote(p[0]))

credits = open(f'{TOOL}/js/credits.js', encoding='utf8').read()
src_by_channel = {ch.lower(): name for name, ch in re.findall(r'name: "([^"]+)", count: \d+, channel: "([^"]+)"', credits)}
JINGLE = [t['yt'] for t in cat if t['tab'] == 'jingle']
SRC_WORDS = r'OpenTracks|DOVA-SYNDROME|DOVA|PeriTune|魔王魂|MusMus|もみじばミュージック|もみじば|h/mix|nonai|zukisuzuki|音獅子|しゃろう|MATSU|Tak_mfk|たう|zippy|柊情景音楽店|NCS'
SUFFIX = re.compile(r'（[^（）]*(' + SRC_WORDS + r')[^（）]*）\s*$')

def clean_title(t):
    m = SUFFIX.search(t)
    if not m:
        return t
    note = re.sub(r'[・／/]?\s*(' + SRC_WORDS + r')\s*[・／/]?', '', m.group(0)[1:-1]).strip('・／/ ')
    base = t[:m.start()].rstrip()
    return f'{base}（{note}）' if note else base

RANK = {'suggested': 0, 'provisional': 1, 'confirmed': 2}
AX = {'scene': 's', 'tone': 't', 'setting': 'g'}
SRC = {'provider_tag': 'p', 'legacy_shelf': 'l', 'title_keyword': 't', 'manual': 'm'}
ST = {'suggested': 's', 'provisional': 'p', 'confirmed': 'c'}

tracks, seen = [], set()
for tr in cat:
    if tr['yt'] in seen or tr['tab'] == 'jingle':
        continue
    seen.add(tr['yt'])
    try:
        a = json.load(open(f"{S}/authors/{tr['yt']}.json", encoding='utf8'))
    except Exception:
        a = {}
    ch = (a.get('author_url') or '').lower()
    source = src_by_channel.get(ch)
    composer = PERSON_CHANNELS.get(ch)
    tags = OrderedDict()   # (axis, id) -> {source, status, evidence[]}
    styles = []

    def put(axis, tid, source_, status, evidence):
        key = (axis, tid)
        cur = tags.get(key)
        if not cur:
            tags[key] = {'axis': axis, 'tag': tid, 'source': source_, 'status': status, 'evidence': [evidence]}
            return
        if evidence not in cur['evidence']:
            cur['evidence'].append(evidence)
        if RANK[status] > RANK[cur['status']] or (RANK[status] == RANK[cur['status']] and source_ == 'provider_tag'):
            cur['status'], cur['source'] = status, source_

    def style(name):
        name = unicodedata.normalize('NFKC', name)
        if name not in styles:
            styles.append(name)

    shelf, base, legacy_styles = OLD_TABS[tr['tab']]
    for axis, vals in base.items():
        for v in vals:
            put(axis, v, 'legacy_shelf', 'provisional', f"旧タブ {tr['tab']}")
    for s_ in legacy_styles:
        style(s_)
    o = ot.get(tr['yt'])
    if o:
        composer = o.get('composer') or composer
        for tg in o.get('tags', []):
            code, name = tg['code'], unicodedata.normalize('NFKC', tg['name'])
            if code in OT:
                t_, st = OT[code]
                for axis, vals in t_.items():
                    for v in vals:
                        put(axis, v, 'provider_tag', st, f'OpenTracks {code} {name}')
            if code in OT_STYLE_CODES:
                style(name)
    for slug in sorted(ptmap.get(tr['yt'], [])):
        t_, st, sty = PT.get(slug, ({}, '', []))
        for axis, vals in t_.items():
            for v in vals:
                put(axis, v, 'provider_tag', st, f'PeriTune {slug}')
        for s_ in sty:
            style(s_)
    title = clean_title(tr['title'])
    for rx, t_ in TITLE:
        m = re.search(rx, title, re.I)
        if m:
            for axis, vals in t_.items():
                for v in vals:
                    put(axis, v, 'title_keyword', 'suggested', f'曲名「{m.group(0)}」')
    # shelves: legacy tab gives a provisional membership; everything else is only a candidate
    shelves = OrderedDict()
    if shelf:
        shelves[shelf] = 'provisional'
    cands = []
    for (axis, tid), info in tags.items():
        if axis == 'scene' and tid in CANDIDATE_BY_SCENE:
            sh = CANDIDATE_BY_SCENE[tid]
            if sh not in shelves and sh not in cands:
                cands.append(sh)
    if not shelf:
        for tone, sh in CANDIDATE_BY_TONE:
            info = tags.get(('tone', tone))
            if info and info['status'] != 'suggested' and sh not in cands:
                cands.append(sh)
                break
    for sh in cands:
        shelves[sh] = 'candidate'
    tracks.append({'yt': tr['yt'], 'title': title, 'composer': composer, 'source': source, 'legacyTab': tr['tab'],
                   'tags': list(tags.values()), 'styles': styles, 'shelves': shelves,
                   'otDetail': (o or {}).get('detailId'), 'ptTags': sorted(ptmap.get(tr['yt'], []))})

def tag_status(t):
    if not t['tags']:
        return 'untagged'
    best = max(RANK[x['status']] for x in t['tags'])
    return ['suggested', 'provisional', 'confirmed'][best]

def shelf_status(t):
    vals = list(t['shelves'].values())
    if 'confirmed' in vals:
        return 'confirmed'
    if 'provisional' in vals:
        return 'provisional'
    if 'candidate' in vals:
        return 'candidate'
    return 'none'

def review(t):
    reasons, prio = [], 3
    public = [s for s, st in t['shelves'].items() if st != 'candidate']
    cands = [s for s, st in t['shelves'].items() if st == 'candidate']
    if not public:
        reasons.append('旧タブに対応する棚がなく、公開棚に入っていない' if not OLD_TABS[t['legacyTab']][0] else '公開棚に入っていない')
        prio = 1
    if len(cands) >= 2:
        reasons.append(f'候補の棚が複数（{len(cands)}）')
        prio = min(prio, 2)
    elif cands:
        reasons.append('候補の棚あり')
        prio = min(prio, 2 if not public else 3)
    amb = [x for x in t['tags'] if x['status'] == 'suggested']
    if amb:
        reasons.append('仮の候補タグあり（' + '、'.join(TAG_JA[x['axis']][x['tag']] for x in amb) + '）')
        prio = min(prio, 2 if any(x['source'] == 'provider_tag' for x in amb) else 3)
    if not t['tags']:
        reasons.append('タグなし')
        prio = min(prio, 2)
    if not t['composer']:
        reasons.append('作曲者が不明')
    return reasons, prio

for t in tracks:
    t['tagStatus'] = tag_status(t)
    t['shelfStatus'] = shelf_status(t)
    t['reviewReasons'], t['priority'] = review(t)
    # needs a person: anything beyond an unknown composer (no tag has been checked by listening yet either way)
    t['reviewRequired'] = bool([r for r in t['reviewReasons'] if r != '作曲者が不明'])

# ---------- js/library-data.js ----------
def js(v):
    return json.dumps(v, ensure_ascii=False)

rows = []
for t in tracks:
    tg = ' '.join(f"{AX[x['axis']]}:{x['tag']}:{SRC[x['source']]}:{ST[x['status']]}" for x in t['tags'])
    rows.append('    ' + js([t['yt'], t['title'], t['composer'], t['source'], t['legacyTab'], tg, '|'.join(t['styles'])]))
shelf_lines = []
for s in SHELVES:
    ids = [t['yt'] + ('!' if t['shelves'].get(s) == 'confirmed' else '') for t in tracks if t['shelves'].get(s) in ('provisional', 'confirmed')]
    cands = [t['yt'] for t in tracks if t['shelves'].get(s) == 'candidate']
    shelf_lines.append(f"    {{ id: {js(s)}, ids: {js(ids)}, candidates: {js(cands)} }}")
legacy = {k: v[0] for k, v in OLD_TABS.items()}
legacy['jingle'] = None
out = f"""/* KPレス・ジュークボックスメーカー — Music Library（レコード棚）の曲マスタと初期の棚
 * TRACKS: [YouTube ID, 曲名, 作曲者|null, 配布元|null, 旧タブ, タグ, 音楽スタイル（| 区切り）]
 *   タグは「軸:ID:情報源:状態」を空白区切り。軸 s=Scene t=Tone g=Setting、
 *   情報源 p=配布元サイトのタグ l=旧タブ t=曲名のキーワード m=手作業、状態 s=候補 p=仮 c=確認済み。
 *   楽器・音楽ジャンルはタグにせず、音楽スタイルとして別に持つ。
 *   作曲者は配布元サイトに載っているか、1人のチャンネルのときだけ入れる（推測では埋めない）。
 * SHELVES: 用途別15棚。ids は公開する所属（旧タブから引き継いだ仮の所属。末尾 ! は確認済み）、
 *   candidates は自動推定の候補（公開しない。レビュー用）。棚の所属はタグとは別に持ち、タグを直しても変わらない。
 * 曲そのものはこのツールに含めず、YouTube の埋め込みで音声だけを流す。使える範囲は各動画の概要欄で確かめてもらう。
 * このファイルは scripts/library/buildlib.py で書き出している。 */
(function () {{
  'use strict';

  // 曲や棚の初期値を変えたら上げる（保存済みの棚に新しい曲を足すため）
  const VERSION = 9;

  const TRACKS = [
{(',' + chr(10)).join(rows)}
  ];

  const SHELVES = [
{(',' + chr(10)).join(shelf_lines)}
  ];

  // 版8までの棚（ccfoliaJukebox.shelf）のタブを、新しい棚に読み替える。null は対応する棚なし
  const LEGACY_TABS = {js(legacy)};
  // 版9で外した曲（ジングル。効果音ライブラリを作るまで提供しない）
  const DROPPED = {js(JINGLE)};
  // 埋め込み再生できなくなって差し替えた曲（版8まで）。古い棚を作り直すとき、メモごと新しい曲へ移す
  const REPLACED = {{ '0mbmvlg8iZU': ['6Y4c6hdvV4Y', 'Fairy Tale'], 'A_Tlq2opviQ': ['yeyfRn6zc8Q', 'Thief\\'s time'], 'ISHbwrrNTeM': ['_v9eOCZsKz4', '決戦'] }};

  const AXIS = {{ s: 'scene', t: 'tone', g: 'setting' }};
  const SOURCE = {{ p: 'provider_tag', l: 'legacy_shelf', t: 'title_keyword', m: 'manual' }};
  const STATUS = {{ s: 'suggested', p: 'provisional', c: 'confirmed' }};
  const byId = new Map();
  const list = TRACKS.map(([yt, title, composer, source, legacy, tagText, styleText]) => {{
    const tags = tagText ? tagText.split(' ').map(x => {{ const [a, id, src, st] = x.split(':'); return {{ axis: AXIS[a], id, source: SOURCE[src], status: STATUS[st] }}; }}) : [];
    const tr = {{ yt, title, composer, source, legacy, tags, styles: styleText ? styleText.split('|') : [] }};
    byId.set(yt, tr);
    return tr;
  }});

  window.JukeboxLibrary = {{
    VERSION,
    LEGACY_TABS,
    DROPPED,
    REPLACED,
    SCENES: {js(SCENES)},
    TONES: {js(TONES)},
    SETTINGS: {js(SETTINGS)},
    tracks: list,
    track: yt => byId.get(yt) || null,
    shelfIds: SHELVES.map(s => s.id),
    candidates: id => {{ const s = SHELVES.find(x => x.id === id); return s ? s.candidates.slice() : []; }},
    // 毎回まっさらなコピーを返す（画面側で書き換えるため）。候補は入れない
    defaults() {{
      return SHELVES.map(s => ({{ id: s.id, name: '', tracks: s.ids.map(x => ({{ yt: x.replace(/!$/, ''), title: '' }})) }}));
    }}
  }};
}})();
"""
open(f'{TOOL}/js/library-data.js', 'w', encoding='utf8').write(out)
json.dump(tracks, open(f'{S}/libreport.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)

pub = Counter(s for t in tracks for s, st in t['shelves'].items() if st != 'candidate')
cnd = Counter(s for t in tracks for s, st in t['shelves'].items() if st == 'candidate')
print('tracks', len(tracks), 'public shelves', dict(pub), 'candidates', dict(cnd))
print('no public shelf', sum(1 for t in tracks if t['shelfStatus'] in ('candidate', 'none')), 'no tags', sum(1 for t in tracks if not t['tags']))
print('tag status', Counter(t['tagStatus'] for t in tracks))
if not OUT:
    sys.exit(0)

# ---------- review files ----------
os.makedirs(OUT, exist_ok=True)
def jdump(v):
    return json.dumps(v, ensure_ascii=False)
def ids(t, axis):
    return [x['tag'] for x in t['tags'] if x['axis'] == axis]

with open(f'{OUT}/music-library-tracks.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['trackId', 'youtubeId', 'title', 'composer', 'source', 'legacyTab', 'shelves', 'sceneTags', 'toneTags', 'settingTags',
                'musicStyles', 'tagEvidence', 'tagStatus', 'shelfStatus', 'reviewRequired'])
    for t in tracks:
        w.writerow([f"yt:{t['yt']}", t['yt'], t['title'], t['composer'] or '', t['source'] or '', t['legacyTab'],
                    jdump([s for s, st in t['shelves'].items() if st != 'candidate']),
                    jdump(ids(t, 'scene')), jdump(ids(t, 'tone')), jdump(ids(t, 'setting')), jdump(t['styles']),
                    jdump([{'axis': x['axis'], 'tag': x['tag'], 'source': x['source'], 'status': x['status'], 'evidence': x['evidence']} for x in t['tags']]),
                    t['tagStatus'], jdump(dict(t['shelves'])), 'true' if t['reviewRequired'] else 'false'])

with open(f'{OUT}/music-library-tag-summary.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['category', 'tag', 'tagLabel', 'trackCount', 'confirmedCount', 'provisionalCount', 'suggestedCount'])
    for axis, idsl in (('scene', SCENES), ('tone', TONES), ('setting', SETTINGS)):
        for tid in idsl:
            xs = [x for t in tracks for x in t['tags'] if x['axis'] == axis and x['tag'] == tid]
            c = Counter(x['status'] for x in xs)
            w.writerow([axis, tid, TAG_JA[axis][tid], len(xs), c['confirmed'], c['provisional'], c['suggested']])

with open(f'{OUT}/music-library-shelf-summary.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['shelfId', 'shelfName', 'trackCount', 'confirmedCount', 'provisionalCount', 'candidateCount'])
    w.writerow(['all', 'ALL', len(tracks), 0, 0, 0])
    for s in SHELVES:
        c = Counter(t['shelves'][s] for t in tracks if s in t['shelves'])
        w.writerow([s, SHELF_JA[s], c['confirmed'] + c['provisional'], c['confirmed'], c['provisional'], c['candidate']])

queue = sorted([t for t in tracks if t['reviewReasons'] and t['reviewReasons'] != ['作曲者が不明']], key=lambda t: (t['priority'], t['legacyTab'], t['title']))
with open(f'{OUT}/music-library-review-queue.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['trackId', 'title', 'composer', 'youtubeUrl', 'legacyTab', 'currentShelves', 'proposedShelves', 'sceneTags', 'toneTags',
                'settingTags', 'reviewReason', 'priority'])
    for t in queue:
        w.writerow([f"yt:{t['yt']}", t['title'], t['composer'] or '', f"https://www.youtube.com/watch?v={t['yt']}", t['legacyTab'],
                    jdump([s for s, st in t['shelves'].items() if st != 'candidate']),
                    jdump([s for s, st in t['shelves'].items() if st == 'candidate']),
                    jdump(ids(t, 'scene')), jdump(ids(t, 'tone')), jdump(ids(t, 'setting')), ' / '.join(t['reviewReasons']), t['priority']])

json.dump({'queue': len(queue), 'prio': Counter(t['priority'] for t in queue)}, sys.stdout, default=str)
print()
