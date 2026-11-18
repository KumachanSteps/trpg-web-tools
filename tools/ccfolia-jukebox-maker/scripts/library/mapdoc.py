# python3 -I mapdoc2.py <work dir> > TAG-MAPPING.md   (rules from libmap.py, counts from libreport.json)
import sys, json
from collections import Counter
sys.path.insert(0, sys.argv[1])
from libmap import *  # noqa
S = sys.argv[1]
rep = json.load(open(f'{S}/libreport.json', encoding='utf8'))
OTN = {'m01': '明るい', 'm02': '楽しい', 'm03': '温かい', 'm04': '穏やか', 'm05': '優しい', 'm06': '懐かしい', 'm07': '不思議', 'm09': '可愛い', 'm12': '慎ましい', 'm13': '寂しい', 'm14': '切ない', 'm15': '冷たい', 'm16': '暗い', 'm17': '悲しい', 'm18': '怒り', 'm19': '恐ろしい', 'm20': '激しい', 'm21': 'サイバー', 'm22': 'ファンタジー', 'm23': 'コメディー', 'm24': '悪意', 'm25': '怪しい', 'm26': '絶望', 'm27': '希望', 'm29': '虚無', 'm30': '爽やか', 'm31': 'お洒落', 'm32': '力強い', 'm34': '緊張感', 'm35': '日常', 'm36': '情熱', 'm38': '淡白', 'r06': '速い', 'r10': '軽快', 'r11': '鈍重', 'r23': '和風', 'r29': '壮大'}
STJ = {'provisional': '仮', 'suggested': '候補', '': '—'}


def fmt(tags):
    parts = []
    for ax, lab in (('scene', 'Scene'), ('tone', 'Tone'), ('setting', 'Setting')):
        if tags.get(ax):
            parts.append(f"{lab}: " + '、'.join(TAG_JA[ax][v] for v in tags[ax]))
    return ' / '.join(parts) or '（タグにしない）'


o = []
w = o.append
w('# Music Library タグ変換表（レビュー用）')
w('')
w('`libmap.py` の中身を表にしたもの。2026-11-18 の改修（ジャンルから雰囲気を推定しない、タグと棚の所属を分ける）を反映。試聴して確かめたタグはまだなく、状態は「仮」（provisional）か「候補」（suggested）だけ。候補は検索に使わない。')
w('')
w('## 旧タブ（v0.50 の24タブ）')
w('')
w('| 旧タブ | 公開棚（仮の所属） | タグ（情報源 legacy_shelf・仮） | 音楽スタイル |')
w('|---|---|---|---|')
for tab, (sh, tags, sty) in OLD_TABS.items():
    w(f"| {tab} | {SHELF_JA[sh] if sh else '—'} | {fmt(tags) if tags else '—'} | {'、'.join(sty) or '—'} |")
w('| jingle | （外す） | — | — |')
w('')
w('## OpenTracks の雰囲気・リズムタグ（情報源 provider_tag）')
w('')
w('| コード | OpenTracks の表記 | タグ | 状態 |')
w('|---|---|---|---|')
for code, (tags, st) in OT.items():
    w(f'| {code} | {OTN.get(code, "")} | {fmt(tags)} | {STJ[st]} |')
w('')
w('使わないコード: ' + '、'.join(OT_UNUSED) + '。ジャンル（r12〜r35 の一部）と楽器（i01〜i26）は、サイトの表記のまま音楽スタイルに入れる。')
w('')
w('## PeriTune のタグ（情報源 provider_tag）')
w('')
w('| タグ | タグ | 状態 | 音楽スタイル |')
w('|---|---|---|---|')
for slug, (tags, st, sty) in PT.items():
    w(f"| {slug} | {fmt(tags) if tags else '—'} | {STJ[st] if tags else '—'} | {'、'.join(sty) or '—'} |")
w('')
w('## 曲名のキーワード（情報源 title_keyword・すべて候補）')
w('')
w('| キーワード（正規表現） | タグ |')
w('|---|---|')
for rx, tags in TITLE:
    w(f"| `{rx.replace('|', ' / ')}` | {fmt(tags)} |")
w('')
w('## 候補の棚（公開しない。レビュー用）')
w('')
w('- Scene タグから: ' + '、'.join(f'{TAG_JA["scene"][k]} → {SHELF_JA[v]}' for k, v in CANDIDATE_BY_SCENE.items()) + '（状態を問わず）')
w('- 公開棚がない曲だけ、Tone タグ（仮）の最初に合ったもの: ' + '、'.join(f'{TAG_JA["tone"][k]} → {SHELF_JA[v]}' for k, v in CANDIDATE_BY_TONE))
w('')
w('## 作曲者')
w('')
w('OpenTracks の曲ページに載っている作曲者か、1人で運営しているチャンネル（下の表）の曲だけ入れる。それ以外は空欄（推測しない）。')
w('')
w('| チャンネル | 作曲者 |')
w('|---|---|')
for ch, name in PERSON_CHANNELS.items():
    w(f'| {ch} | {name} |')
w('')
w('## 結果の数（640曲）')
w('')
pub = Counter(s for t in rep for s, st in t['shelves'].items() if st != 'candidate')
cnd = Counter(s for t in rep for s, st in t['shelves'].items() if st == 'candidate')
w('| 棚 | 公開（仮） | 候補 |')
w('|---|---:|---:|')
for s in SHELVES:
    w(f'| {SHELF_JA[s]} | {pub[s]} | {cnd[s]} |')
w('')
w(f"タグの状態（曲ごと）: " + '、'.join(f'{k} {v}' for k, v in sorted(Counter(t['tagStatus'] for t in rep).items())))
print('\n'.join(o))
