# python3 -I reportv2.py <work dir> <report dir>
#  reads <work dir>/baseline-v051.json (the published v0.51 data, dumped from js/library-data.js before this fix)
#  and <work dir>/libreport.json (current build) -> v2 review CSVs and the summary numbers (summary-v2.json)
import json, sys, os, csv
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[0])))
from libmap import SHELVES, SHELF_JA, TAG_JA, SCENES, TONES, SETTINGS  # noqa

S, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
old = {t['yt']: t for t in json.load(open(f'{S}/baseline-v051.json', encoding='utf8'))}
new = json.load(open(f'{S}/libreport.json', encoding='utf8'))

pub = lambda t: [s for s, st in t['shelves'].items() if st != 'candidate']
cand = lambda t: [s for s, st in t['shelves'].items() if st == 'candidate']
usable = lambda t, a: [x['tag'] for x in t['tags'] if x['axis'] == a and x['status'] != 'suggested']
sugg = lambda t: [f"{x['axis']}:{x['tag']}" for x in t['tags'] if x['status'] == 'suggested']
o_usable = lambda t, a: [x['id'] for x in t['tags'] if x['axis'] == a and x['status'] != 'suggested']
o_all = lambda t, a: sorted({x['id'] for x in t['tags'] if x['axis'] == a})
jd = lambda v: json.dumps(v, ensure_ascii=False)

def groups(t):
    g = []
    o = old[t['yt']]
    if t['otBulk'] or len(o_all(o, 'tone')) >= 8:
        g.append('A')
    if not pub(t) and cand(t):
        g.append('B')
    if not pub(t) and not cand(t):
        g.append('C')
    if not any(usable(t, a) for a in ('scene', 'tone', 'setting')):
        g.append('D')
    if not t['composer']:
        g.append('E')
    if len(cand(t)) >= 2:
        g.append('F')
    return g

GROUP_JA = {'A': 'タグ抽出に問題の可能性（OpenTracks の一括付与、または修正前に Tone 8種以上）',
            'B': '公開棚なし・候補の棚あり', 'C': '公開棚なし・候補の棚なし', 'D': '検索に使えるタグがない',
            'E': '作曲者が未登録', 'F': '候補の棚が複数'}
PRIO = {'A': 1, 'B': 1, 'F': 2, 'D': 2, 'C': 2, 'E': 3}

def reason(t, g):
    r = []
    if 'A' in g:
        if t['otBulk']:
            pairs = '、'.join(f'{a}×{b}' for a, b in t['otOpposed'])
            r.append(f'OpenTracks の曲ページで対立する雰囲気タグが同時に付いている（{pairs}）。配布元タグは候補に下げた。試聴して Tone を付け直す')
        else:
            r.append('修正前は Tone が8種以上。今回の再取得で一括付与には当たらなかった。試聴して確かめる')
    if 'B' in g:
        r.append('候補の棚: ' + '・'.join(SHELF_JA[s] for s in cand(t)) + '。試聴して公開するか決める')
    if 'C' in g:
        r.append('候補の棚もない。用途を決める')
    if 'D' in g:
        r.append('検索に使えるタグ（仮・確認済み）がない' + ('（候補タグのみ）' if t['tags'] else '（タグなし）'))
    if 'E' in g:
        r.append('作曲者を確認できなかった')
    if 'F' in g and 'B' not in g:
        r.append('候補の棚が複数: ' + '・'.join(SHELF_JA[s] for s in cand(t)))
    return ' / '.join(r)

def changes(t):
    o = old[t['yt']]
    c = []
    if (o['composer'] or '') != (t['composer'] or ''):
        c.append('作曲者')
    for a in ('scene', 'tone', 'setting'):
        if sorted(o_usable(o, a)) != sorted(usable(t, a)):
            c.append({'scene': 'Scene', 'tone': 'Tone', 'setting': 'Setting'}[a])
    if sorted(o['styles']) != sorted(t['styles']):
        c.append('音楽スタイル')
    if sorted(o['cands']) != sorted(cand(t)):
        c.append('候補の棚')
    if sorted(o['shelves']) != sorted(pub(t)):
        c.append('公開棚')
    return c

rows = []
for t in new:
    g = groups(t)
    t['_g'], t['_c'] = g, changes(t)
    rows.append(t)

with open(f'{OUT}/music-library-tracks-v2.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['trackId', 'youtubeId', 'title', 'composer', 'composerEvidence', 'source', 'legacyTab', 'shelves', 'candidateShelves',
                'sceneTags', 'toneTags', 'settingTags', 'suggestedTags', 'musicStyles', 'tagEvidence', 'openTracksPage', 'openTracksRawTags',
                'openTracksBulkTagged', 'openTracksOpposedPairs', 'periTuneTags', 'tagStatus', 'shelfStatus', 'reviewGroups', 'changedFields'])
    for t in rows:
        w.writerow([f"yt:{t['yt']}", t['yt'], t['title'], t['composer'] or '', t['composerEvidence'], t['source'] or '', t['legacyTab'],
                    jd(pub(t)), jd(cand(t)), jd(usable(t, 'scene')), jd(usable(t, 'tone')), jd(usable(t, 'setting')), jd(sugg(t)), jd(t['styles']),
                    jd([{'axis': x['axis'], 'tag': x['tag'], 'source': x['source'], 'status': x['status'], 'evidence': x['evidence']} for x in t['tags']]),
                    f"https://opentracks.com/bgm/detail/{t['otDetail']}" if t['otDetail'] else '', jd(t['otRawTags']),
                    'true' if t['otBulk'] else 'false', jd([f'{a}×{b}' for a, b in t['otOpposed']]), jd(t['ptTags']),
                    t['tagStatus'], t['shelfStatus'], ';'.join(t['_g']), ';'.join(t['_c'])])

queue = sorted([t for t in rows if t['_g'] and t['_g'] != ['E']] + [t for t in rows if t['_g'] == ['E']],
               key=lambda t: (min(PRIO[x] for x in t['_g']), t['_g'], t['legacyTab'], t['title']))
with open(f'{OUT}/music-library-review-queue-v2.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['trackId', 'title', 'composer', 'youtubeUrl', 'legacyTab', 'currentShelves', 'candidateShelves', 'sceneTags', 'toneTags',
                'settingTags', 'groups', 'groupA', 'groupB', 'groupC', 'groupD', 'groupE', 'groupF', 'reviewReason', 'priority'])
    for t in queue:
        g = t['_g']
        w.writerow([f"yt:{t['yt']}", t['title'], t['composer'] or '', f"https://www.youtube.com/watch?v={t['yt']}", t['legacyTab'],
                    jd(pub(t)), jd(cand(t)), jd(usable(t, 'scene')), jd(usable(t, 'tone')), jd(usable(t, 'setting')), ';'.join(g)]
                   + ['1' if x in g else '' for x in 'ABCDEF'] + [reason(t, g), min(PRIO[x] for x in g)])

# ---------- numbers for the summary / audit ----------
O = list(old.values())
def axis_counts(get, items, axis, ids):
    return {i: sum(1 for t in items if i in get(t, axis)) for i in ids}
summary = {
    'tracks': len(rows),
    'shelf': {s: [sum(1 for t in O if s in t['shelves']), sum(1 for t in rows if s in pub(t)),
                  sum(1 for t in O if s in t['cands']), sum(1 for t in rows if s in cand(t))] for s in SHELVES},
    'scene': [axis_counts(o_usable, O, 'scene', SCENES), axis_counts(usable, rows, 'scene', SCENES)],
    'tone': [axis_counts(o_usable, O, 'tone', TONES), axis_counts(usable, rows, 'tone', TONES)],
    'setting': [axis_counts(o_usable, O, 'setting', SETTINGS), axis_counts(usable, rows, 'setting', SETTINGS)],
    'noShelf': [sum(1 for t in O if not t['shelves']), sum(1 for t in rows if not pub(t))],
    'noShelfWithCand': [sum(1 for t in O if not t['shelves'] and t['cands']), sum(1 for t in rows if not pub(t) and cand(t))],
    'noTagsAtAll': [sum(1 for t in O if not t['tags']), sum(1 for t in rows if not t['tags'])],
    'noUsableTags': [sum(1 for t in O if not any(o_usable(t, a) for a in ('scene', 'tone', 'setting'))),
                     sum(1 for t in rows if not any(usable(t, a) for a in ('scene', 'tone', 'setting')))],
    'noComposer': [sum(1 for t in O if not t['composer']), sum(1 for t in rows if not t['composer'])],
    'tone8': [sum(1 for t in O if len(o_usable(t, 'tone')) >= 8), sum(1 for t in rows if len(usable(t, 'tone')) >= 8)],
    'tone8all': [sum(1 for t in O if len(o_all(t, 'tone')) >= 8), sum(1 for t in rows if len({x['tag'] for x in t['tags'] if x['axis'] == 'tone'}) >= 8)],
    'toneMax': [max(len(o_usable(t, 'tone')) for t in O), max(len(usable(t, 'tone')) for t in rows)],
    'bulk': sum(1 for t in rows if t['otBulk']),
    'queue': len(queue), 'queueNoEonly': sum(1 for t in queue if t['_g'] != ['E']),
    'groups': {x: sum(1 for t in rows if x in t['_g']) for x in 'ABCDEF'},
    'prio': dict(Counter(min(PRIO[x] for x in t['_g']) for t in queue)),
    'changed': sum(1 for t in rows if t['_c']),
    'changedBy': dict(Counter(c for t in rows for c in t['_c'])),
}
json.dump(summary, open(f'{S}/summary-v2.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in summary.items() if k not in ('shelf', 'scene', 'tone', 'setting')}, ensure_ascii=False))
