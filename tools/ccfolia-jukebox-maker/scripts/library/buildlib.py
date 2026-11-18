# python3 -I buildlib.py <scratch> <tooldir>  -> <tooldir>/js/library-data.js, <scratch>/libreport.json
import json, sys, re, os, glob, urllib.parse
sys.path.insert(0, sys.argv[1])
from libmap import *  # noqa

S, TOOL = sys.argv[1], sys.argv[2]
cat = json.load(open(f'{S}/catalog.json', encoding='utf8'))
ot = json.load(open(f'{S}/otout/ot.json', encoding='utf8')) if os.path.exists(f'{S}/otout/ot.json') else {}
ptmap = {}
if os.path.exists(f'{S}/pt/tagmap.tsv'):
    for line in open(f'{S}/pt/tagmap.tsv', encoding='utf8'):
        p = line.rstrip('\n').split('\t')
        if len(p) >= 3 and re.fullmatch(r'[\w-]{11}', p[2] or ''):
            ptmap.setdefault(p[2], set()).add(urllib.parse.unquote(p[0]))
PT_JA = {'ハロウィン': {'tone': ['comical']}, '中世': {'setting': ['fantasy']}, 'コーラス': {}, 'レトロゲーム': {}}

credits = open(f'{TOOL}/js/credits.js', encoding='utf8').read()
src_by_channel = {ch.lower(): name for name, ch in re.findall(r'name: "([^"]+)", count: \d+, channel: "([^"]+)"', credits)}

JINGLE = [t['yt'] for t in cat if t['tab'] == 'jingle']
SUFFIX = re.compile(r'（[^（）]*(OpenTracks|DOVA-SYNDROME|DOVA|PeriTune|魔王魂|MusMus|もみじば[^（）]*|h/mix|nonai|zukisuzuki|音獅子|しゃろう|MATSU|Tak_mfk|たう|zippy|柊情景音楽店|NCS)[^（）]*）\s*$')

def clean_title(t):
    m = SUFFIX.search(t)
    if not m:
        return t
    inner = m.group(0)
    # keep extra notes such as （1時間・もみじばミュージック） → title（1時間）
    note = re.sub(r'[・／/]?\s*(OpenTracks|DOVA-SYNDROME|DOVA|PeriTune|魔王魂|MusMus|もみじばミュージック|もみじば|h/mix|nonai|zukisuzuki|音獅子|しゃろう|MATSU|Tak_mfk|たう|zippy|柊情景音楽店|NCS)\s*[・／/]?', '', inner[1:-1]).strip('・／/ ')
    base = t[:m.start()].rstrip()
    return f'{base}（{note}）' if note else base

def add(dst, tags):
    for k, vs in tags.items():
        for v in vs:
            if v not in dst[k]:
                dst[k].append(v)

tracks, seen = [], set()
membership = {s: [] for s in SHELVES}
for tr in cat:
    if tr['yt'] in seen or tr['tab'] == 'jingle':
        continue
    seen.add(tr['yt'])
    a = {}
    try:
        a = json.load(open(f"{S}/authors/{tr['yt']}.json", encoding='utf8'))
    except Exception:
        pass
    ch = (a.get('author_url') or '').lower()
    source = src_by_channel.get(ch)
    composer = PERSON_CHANNELS.get(ch)
    tags = {'scene': [], 'tone': [], 'setting': []}
    status = 'p'  # provisional (old tab + title)
    shelf, base = OLD_TABS[tr['tab']]
    add(tags, base)
    o = ot.get(tr['yt'])
    if o:
        composer = o.get('composer') or composer
        for tg in o.get('tags', []):
            add(tags, OT.get(tg['code'], {}))
        status = 's'  # source-tagged
    if tr['yt'] in ptmap:
        for slug in sorted(ptmap[tr['yt']]):
            add(tags, PT.get(slug, PT_JA.get(slug, {})))
        status = 's'
    title = clean_title(tr['title'])
    codes = {tg['code'] for tg in (o or {}).get('tags', [])}
    # combinations: fierce + tense/strong reads as a fight; suspicious + cool-headed/stylish reads as secret talks
    if tr['tab'] in ('climax', 'tension', 'digital', 'fantasy', 'wafu', 'classical', 'ncs', 'horror') and 'intense' in tags['tone'] and ({'heroic'} & set(tags['tone']) or {'r29', 'r13', 'r33', 'r06'} & codes):
        add(tags, {'scene': ['battle']})
    if tr['tab'] in ('deduction', 'unease', 'tension', 'adult', 'jazz') and 'uneasy' in tags['tone'] and {'m37', 'm31', 'm10'} & codes:
        add(tags, {'scene': ['negotiation']})
    for rx, tg in TITLE:
        if re.search(rx, title, re.I):
            add(tags, tg)
    shelves = [shelf] if shelf else []
    if not shelves:
        for axis, val, sh in ORPHAN_RULES:
            if val in tags[axis]:
                shelves.append(sh)
                break
    for axis, val, sh in EXTRA_RULES:
        if val in tags[axis] and sh not in shelves:
            shelves.append(sh)
    for sh in shelves:
        membership[sh].append(tr['yt'])
    tracks.append({'yt': tr['yt'], 'title': title, 'composer': composer, 'source': source, 'scene': tags['scene'],
                   'tone': tags['tone'], 'setting': tags['setting'], 'status': status, 'old': tr['tab'],
                   'shelves': shelves, 'otDetail': (o or {}).get('detailId')})

def js(v):
    return json.dumps(v, ensure_ascii=False)

lines = []
for t in tracks:
    row = [t['yt'], t['title'], t['composer'], t['source'], ' '.join(t['scene']), ' '.join(t['tone']), ' '.join(t['setting']), t['status']]
    lines.append('    ' + js(row))
shelf_lines = []
for s in SHELVES:
    shelf_lines.append(f"    {{ id: {js(s)}, ids: {js(membership[s])} }}")
legacy = {k: v[0] for k, v in OLD_TABS.items()}
legacy['jingle'] = None
out = f"""/* KPレス・ジュークボックスメーカー — Music Library（レコード棚）の曲マスタと初期の棚
 * TRACKS: [YouTube ID, 曲名, 作曲者|null, 配布元|null, Scene, Tone, Setting（空白区切りのID）, タグの状態]
 *   タグの状態 s = 配布元サイトのタグから変換（試聴での確認はまだ）, p = 旧タブと曲名からの仮タグ, r = 確認済み
 *   作曲者は配布元サイトに載っているか、1人のチャンネルのときだけ入れる（推測では埋めない）。
 * SHELVES: 初期の棚（用途別15棚）。1曲が複数の棚に入ってもよい。どの棚にも入らない曲は ALL と検索から見つける。
 * 曲そのものはこのツールに含めず、YouTube の埋め込みで音声だけを流す。使える範囲は各動画の概要欄で確かめてもらう。
 * このファイルは作業用スクリプトで書き出している（手で直すときは TRACKS と SHELVES の両方を確かめる）。 */
(function () {{
  'use strict';

  // 曲や棚の初期値を変えたら上げる（保存済みの棚に新しい曲を足すため）
  const VERSION = 9;

  const TRACKS = [
{(',' + chr(10)).join(lines)}
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

  const byId = new Map();
  const list = TRACKS.map(([yt, title, composer, source, scene, tone, setting, status]) => {{
    const tr = {{ yt, title, composer, source, scene: scene ? scene.split(' ') : [], tone: tone ? tone.split(' ') : [], setting: setting ? setting.split(' ') : [], status }};
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
    // 毎回まっさらなコピーを返す（画面側で書き換えるため）
    defaults() {{
      return SHELVES.map(s => ({{ id: s.id, name: '', tracks: s.ids.map(yt => ({{ yt, title: '' }})) }}));
    }}
  }};
}})();
"""
open(f'{TOOL}/js/library-data.js', 'w', encoding='utf8').write(out)
json.dump(tracks, open(f'{S}/libreport.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)

from collections import Counter
print('tracks', len(tracks), 'jingles dropped', len(JINGLE))
print('status', Counter(t['status'] for t in tracks))
print('composer known', sum(1 for t in tracks if t['composer']), 'source known', sum(1 for t in tracks if t['source']))
print('shelves', {s: len(membership[s]) for s in SHELVES})
print('no shelf', sum(1 for t in tracks if not t['shelves']))
print('no tags', sum(1 for t in tracks if not (t['scene'] or t['tone'] or t['setting'])))
for ax in ('scene', 'tone', 'setting'):
    c = Counter(v for t in tracks for v in t[ax])
    print(ax, dict(c.most_common()))
