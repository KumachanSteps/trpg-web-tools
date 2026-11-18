import json, sys, re, os, subprocess, html, urllib.parse
out_dir = os.path.join(os.environ.get("LIB_WORK", "."), "otout")
cache = os.path.join(out_dir, "cache")
def get(url):
    key = os.path.join(cache, re.sub(r'[^A-Za-z0-9]+', '_', url)[-150:] + '.html')
    if os.path.exists(key) and os.path.getsize(key) > 1000:
        return open(key, encoding='utf8', errors='replace').read()
    r = subprocess.run(['curl', '-s', '--max-time', '25', '-A', 'Mozilla/5.0', url], capture_output=True)
    t = r.stdout.decode('utf8', 'replace')
    if len(t) > 1000:
        open(key, 'w', encoding='utf8').write(t)
    return t

def clean(title):
    t = re.sub(r'（[^（）]*(OpenTracks|DOVA)[^（）]*）\s*$', '', title).strip()
    return t

def parse_detail(page):
    yt = re.findall(r'youtube\.com/embed/([A-Za-z0-9_-]{11})', page)
    d = {'yt': yt[0] if yt else None}
    m = re.search(r'<title>フリーBGM素材『(.*?)』', page)
    d['otTitle'] = html.unescape(m.group(1)) if m else None
    m = re.search(r'trialL-subm_composerName"><div><a href="/creator/detail/(\d+)">([^<]+)</a>', page)
    d['composerId'], d['composer'] = (m.group(1), html.unescape(m.group(2)).strip()) if m else (None, None)
    tags = re.search(r'trialL-below_tags">(.*?)</div>', page, re.S)
    d['tags'] = [{'code': c, 'name': html.unescape(n)} for c, n in re.findall(r'tags_[a-z]=([a-z]\d+)">([^<]+)<', tags.group(1))] if tags else []
    m = re.search(r'素材種別<span>：</span>([^<]+)<', page)
    d['kind'] = m.group(1).strip() if m else None
    m = re.search(r'再生時間<span>：</span>([^<]+)<', page)
    d['duration'] = m.group(1).strip() if m else None
    m = re.search(r'ループ<span>：</span><span class="trialL-detailloop_(\w+)"', page)
    d['loop'] = m.group(1) if m else None
    m = re.search(r'trialL-below_trackP">(.*?)</p>', page, re.S)
    d['comment'] = html.unescape(re.sub(r'<br\s*/?>', '\n', m.group(1))).strip()[:400] if m else ''
    return d

def search_ids(q):
    page = get('https://opentracks.com/bgm?' + urllib.parse.urlencode({'keywords': q}))
    seen = []
    for i in re.findall(r'href="/bgm/detail/(\d+)"', page):
        if i not in seen:
            seen.append(i)
    return seen

def one(tr):
    title = clean(tr['title'])
    queries = [title]
    short = re.split(r'[\s　\-－~～（(]', title)[0]
    if short and short != title:
        queries.append(short)
    tried = set()
    for q in queries:
        ids = search_ids(q)
        # the side bar always lists a few unrelated detail links; candidates are checked by embed id anyway
        for i in ids[:12]:
            if i in tried:
                continue
            tried.add(i)
            d = parse_detail(get(f'https://opentracks.com/bgm/detail/{i}'))
            if d['yt'] == tr['yt']:
                d['detailId'] = i
                return tr['yt'], d
    return tr['yt'], None

