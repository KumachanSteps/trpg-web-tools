# python3 -I migreport.py <work dir> <report dir>
#  reads <work dir>/catalog.json (v0.50 tabs), libreport-v051.json (first v0.51 build), libreport.json (current build)
#  -> <report dir>/music-library-migration-report.md
import json, sys
from collections import Counter
sys.path.insert(0, sys.argv[1])
from libmap import SHELVES, SHELF_JA, TAG_JA, SCENES, TONES, SETTINGS, OLD_TABS  # noqa

S, OUT = sys.argv[1], sys.argv[2]
cat = json.load(open(f'{S}/catalog.json', encoding='utf8'))
old = json.load(open(f'{S}/libreport-v051.json', encoding='utf8'))
new = json.load(open(f'{S}/libreport.json', encoding='utf8'))
oldby = {t['yt']: t for t in old}

L = []
w = L.append
pub = lambda t: [s for s, st in t['shelves'].items() if st != 'candidate']
cand = lambda t: [s for s, st in t['shelves'].items() if st == 'candidate']
usable = lambda t, a: [x['tag'] for x in t['tags'] if x['axis'] == a and x['status'] != 'suggested']
allt = lambda t, a: [x['tag'] for x in t['tags'] if x['axis'] == a]

uniq50 = len({t['yt'] for t in cat})
jingles = [t for t in cat if t['tab'] == 'jingle']
w('# Music Library 移行レポート（v0.50 → v0.51 改修版）')
w('')
w('作成日: 2026-11-18。数はすべて YouTube ID（trackId = `yt:<ID>`）の重複なしで数えています。棚ごとの数は1曲が複数の棚に入ると重複して数えます。')
w('「v0.51 初版」は PR #238 の最初の版（ジャンルから雰囲気を推定していた版）、「改修版」は今回の依頼（A-1・A-2）を反映した版です。v0.51 は未公開なので、利用者の保存データは v0.50（版8）から改修版へ直接移行します。')
w('')
w('## 1. 総数')
w('')
w('| 項目 | v0.50 | v0.51 初版 | 改修版 |')
w('|---|---:|---:|---:|')
w(f'| 曲の行数（旧タブ24の合計） | {len(cat)} | — | — |')
w(f'| 重複なしの曲数 | {uniq50} | {len(old)} | {len(new)} |')
w(f'| ジングル（外した曲） | {len(jingles)} | 0 | 0 |')
w(f'| 公開棚に入っている曲 | {uniq50 - len(jingles)}（ジングル以外は旧タブのどれかに所属） | {sum(1 for t in old if t["shelves"])} | {sum(1 for t in new if pub(t))} |')
w(f'| 公開棚に入っていない曲（ALL と検索では見つかる） | 0 | {sum(1 for t in old if not t["shelves"])} | {sum(1 for t in new if not pub(t))} |')
w(f'| └ そのうち候補の棚がある曲（非公開・レビュー用） | — | — | {sum(1 for t in new if not pub(t) and cand(t))} |')
w(f'| └ 候補の棚もない曲 | — | — | {sum(1 for t in new if not pub(t) and not cand(t))} |')
w(f'| Scene/Tone/Setting のタグが1つもない曲 | — | {sum(1 for t in old if not (t["scene"] or t["tone"] or t["setting"]))} | {sum(1 for t in new if not t["tags"])} |')
w(f'| 検索に使えるタグ（仮・確認済み）がない曲 | — | — | {sum(1 for t in new if not any(x["status"] != "suggested" for x in t["tags"]))} |')
w(f'| 音楽スタイル（musicStyles）がある曲 | — | — | {sum(1 for t in new if t["styles"])} |')
w('')
w('ジングル以外で失われた曲はありません（v0.50 のジングル以外の曲はすべて ALL に残っています）。' if {t['yt'] for t in cat if t['tab'] != 'jingle'} <= {t['yt'] for t in new} else '**注意: ジングル以外で失われた曲があります。**')
w('')
w('タグの状態（曲ごとに、いちばん強い状態）: ' + '、'.join(f'{k} {v}' for k, v in sorted(Counter(t['tagStatus'] for t in new).items())))
w('')
w('棚の状態（曲ごと）: ' + '、'.join(f'{k} {v}' for k, v in sorted(Counter(t['shelfStatus'] for t in new).items())) + '。confirmed（試聴して確定）はまだ0曲です。')
w('')

w('## 2. 棚ごとの曲数')
w('')
w('| 棚 | v0.50 の旧タブ | v0.51 初版 | 改修版（公開: 仮） | 改修版（候補・非公開） |')
w('|---|---:|---:|---:|---:|')
legacy_of = {}
for tab, (sh, _, _) in OLD_TABS.items():
    if sh:
        legacy_of.setdefault(sh, []).append(tab)
oc = Counter(s for t in old for s in t['shelves'])
for s in SHELVES:
    l50 = sum(1 for t in cat if t['tab'] in legacy_of.get(s, []))
    w(f'| {SHELF_JA[s]}（{s}） | {l50 if legacy_of.get(s) else "—"} | {oc[s]} | {sum(1 for t in new if s in pub(t))} | {sum(1 for t in new if s in cand(t))} |')
w(f'| ALL | {uniq50} | {len(old)} | {len(new)} | — |')
w('')
w('会話・交流、密談・駆け引き、戦闘・対決の3棚は、v0.50 に対応する旧タブがなく、初版ではジャズ・アダルト・戦闘系タグから自動で入れていました。改修版では自動では入れないので公開棚は0曲になり、画面では「確認中（候補N曲）」と表示します。')
w('')

w('## 3. タグ数の変化')
w('')
w('「初版」は v0.51 初版で付いていた曲数、「改修版」は今回付いている曲数（全状態）、「うち検索に使う」は仮・確認済みの数（候補 suggested は検索に使いません）。変化があったタグだけ載せています。')
w('')
for axis, ids in (('scene', SCENES), ('tone', TONES), ('setting', SETTINGS)):
    w(f'### {axis.capitalize()}')
    w('')
    w('| タグ | 初版 | 改修版 | うち検索に使う | 差 |')
    w('|---|---:|---:|---:|---:|')
    for tid in ids:
        a = sum(1 for t in old if tid in t[axis])
        b = sum(1 for t in new if tid in allt(t, axis))
        c = sum(1 for t in new if tid in usable(t, axis))
        if a != b or a != c:
            w(f'| {TAG_JA[axis][tid]}（{tid}） | {a} | {b} | {c} | {b - a:+d} |')
    w('')

w('## 4. 作曲者が不明の曲')
w('')
unk = [t for t in new if not t['composer']]
w(f'{len(unk)}曲。配布元サイトに作曲者が載っていない、または複数人のチャンネルで個人を特定できない曲です。推測では埋めていません（CSV では空欄）。')
w('')
w('| 配布元 | 曲数 |')
w('|---|---:|')
for src, n in Counter(t['source'] or '（配布元も未確認）' for t in unk).most_common():
    w(f'| {src} | {n} |')
w('')

w('## 5. 棚の所属が変わった曲（v0.51 初版 → 改修版の公開棚）')
w('')
changed = []
for t in new:
    o = oldby.get(t['yt'])
    before = sorted(o['shelves']) if o else []
    after = sorted(pub(t))
    if before != after:
        changed.append((t, before, after))
w(f'{len(changed)}曲。v0.50 の旧タブから見ると、旧タブが用途の棚に対応する曲はすべて同じ棚に入ったままで、変わったのは初版で自動推定して足していた分です。')
w('')
moves = Counter()
for t, b, a in changed:
    for s in set(b) - set(a):
        moves[f'{SHELF_JA[s]} から外れた'] += 1
    for s in set(a) - set(b):
        moves[f'{SHELF_JA[s]} に入った'] += 1
w('| 変化 | 曲数 |')
w('|---|---:|')
for k, n in moves.most_common():
    w(f'| {k} | {n} |')
w('')
w('1曲ずつの一覧は music-library-review-queue.csv（currentShelves と proposedShelves）と music-library-tracks.csv で確認できます。')
w('')

w('## 6. 適用したルール')
w('')
w('- 楽器・ジャンル（ケルト、ピアノ、ジャズ、アダルト、クラシック、NCS、デジタル、民族系、和楽器など）は Scene/Tone/Setting にせず、`musicStyles` に入れた。ジャンルから雰囲気（郷愁・自然・静か・疾走・交流・優雅・都市・西洋古典・幻想・激しい・コミカル）は推定しない。')
w('- ファンタジーの旧タブ・タグは Setting `fantasy` だけにした。ハロウィンはタグを付けない。ロック系は `musicStyles` だけ。')
w('- OpenTracks の「不思議・虚無・力強い・情熱」などあいまいなタグは `suggested`（候補）にとどめ、確定扱いしない。')
w('- 曲名のキーワードから付けた Scene/Tone は、すべて `suggested`（候補）。検索には使わない。')
w('- 各タグに情報源（provider_tag / legacy_shelf / title_keyword / manual）と状態（suggested / provisional / confirmed）を持たせた。試聴して確かめたタグはまだないので、confirmed は0。')
w('- 棚の所属はタグと別に持つ。旧タブが用途の棚に対応する曲だけ `provisional`（仮）で公開棚に入れ、それ以外のタグから推定した棚は `candidate`（候補・非公開）にした。タグを直しても棚の所属は変わらない。')
w('- 曲は削除していない（ジングル8曲を除く）。公開棚に入らない曲も ALL・検索・お気に入りから使える。')
w('')

w('## 7. 未解決の課題')
w('')
w(f'- 公開棚に入っていない曲が {sum(1 for t in new if not pub(t))}曲（ジャンル系の旧タブだった曲が中心）。候補の棚がある {sum(1 for t in new if not pub(t) and cand(t))}曲は、試聴して棚を決める必要がある。')
w('- 会話・交流、密談・駆け引き、戦闘・対決の3棚が公開0曲。候補を試聴して入れるか、棚を見直すかの判断が必要。')
w(f'- タグがまったくない曲が {sum(1 for t in new if not t["tags"])}曲。配布元にタグがない曲（PeriTune 以外の個人サイトなど）が中心。')
w('- 曲名から付けた候補タグ（suggested）と、あいまいな配布元タグは、試聴して確定するか外すかを決める必要がある。')
w(f'- 作曲者不明が {len(unk)}曲。配布元の曲ページで確かめられたものだけ埋める。')
w('- OpenTracks の曲ページが見つからなかった曲は、配布元タグがなく旧タブだけが根拠になっている。')
w('- BGM素材サイト紹介の9サイトは紹介だけで、曲はライブラリに入れていない（公式YouTubeがあり埋め込みで試聴できる曲だけを、別の工程で調べて追加する）。')
w('')
open(f'{OUT}/music-library-migration-report.md', 'w', encoding='utf8').write('\n'.join(L))
print('ok', len(changed))
