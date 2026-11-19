# second pass: for unmatched OpenTracks tracks, walk all search result pages and check every result whose title equals ours
import json, sys, re, os, html, urllib.parse
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(sys.argv[0])))
import otharvest_lib as L

S = sys.argv[1]
cat = json.load(open(f'{S}/catalog.json', encoding='utf8'))
ot = json.load(open(f'{S}/otout/ot.json', encoding='utf8'))
miss = [t for t in cat if t['author'].startswith('OpenTracks') and not ot.get(t['yt'])]

def norm(s):
    return re.sub(r'\s+', '', html.unescape(s)).lower()

def one(tr):
    title = L.clean(tr['title'])
    want = norm(title)
    for page in range(1, 40):
        q = {'keywords': title}
        if page > 1:
            q['page'] = page
        p = L.get('https://opentracks.com/bgm?' + urllib.parse.urlencode(q))
        items = re.findall(r'href="/bgm/detail/(\d+)">([^<]{1,80})<', p)
        if not items:
            break
        for i, name in items:
            if norm(name) == want or norm(name).startswith(want):
                d = L.parse_detail(L.get(f'https://opentracks.com/bgm/detail/{i}'))
                if d['yt'] == tr['yt']:
                    d['detailId'] = i
                    return tr['yt'], d
        if f'page={page + 1}' not in p:
            break
    return tr['yt'], None

with ThreadPoolExecutor(4) as ex:
    for yt, d in ex.map(one, miss):
        if d:
            ot[yt] = d
json.dump(ot, open(f'{S}/otout/ot.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('missing before', len(miss), 'matched now', sum(1 for t in miss if ot.get(t['yt'])))
