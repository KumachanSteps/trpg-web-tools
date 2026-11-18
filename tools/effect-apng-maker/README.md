# 演出APNGメーカー（Effect APNG Maker / 연출 APNG 메이커）

場面転換・天候・ホラー演出などのAPNG素材を、ライブラリから選んで調整し、ココフォリアの部屋で使える形で書き出すツール。
v0.29 は限定テスト版（`noindex`、ポータルのカードなし、直リンクのみ）。

## 画面

| パネル | 役割 |
| --- | --- |
| アセットライブラリ（左） | カテゴリ・検索（日英韓中の名前とタグ）・絞り込み（転換／ループ／1回／★お気に入り）。カードにマウスを乗せると動く |
| プレビュー（中央） | ココフォリアと同じ順（背景 → 立ち絵 → 前景の演出）で重ねる。背景と立ち絵（PNG）はアップロードしてドラッグで配置。IndexedDB に保存し、送信しない |
| 調整（右） | 再生（ループ／1回／回数）、転換の向き（out／in／inout）、長さ、不透明度、アセット固有の設定、書き出し |

書き出しの目安：初期値は 960×540、3MB 未満。3〜4MB は注意、4MB を超えるとダウンロードできない（「軽くする」で 色数 → FPS → 大きさ の順に下げる）。
APNG のほか WebP も書き出せる（ココフォリア v1.33.5 以降で APNG がうまく動かないときの代わり）。背景の焼き込みは任意（初期値は演出だけ・透過）。

## アセットの足し方

アセットは `library/<カテゴリ>/<名前>/` のフォルダ1つ。アプリのコードは触らない。

```
library/
  kit.js                  共通部品（seed 付き乱数、形、粒子、ビネット、稲妻など）
  manifest.json            生成物。手で直さない
  weather/rain/
    asset.json             名前（ja/en/ko/zh）、タグ、再生、長さ、設定項目、書き出しの初期値、ライセンス
    render.js              描画（procedural のとき）
```

1. 近いアセットのフォルダをコピーして `asset.json` と `render.js` を書き換える。
2. `node tools/effect-apng-maker/scripts/build-manifest.mjs` … `asset.json` を検査して `manifest.json` を作る（`--check` で検査だけ）。
3. `node tools/effect-apng-maker/scripts/build-thumbs.mjs [id,id]` … ライブラリの静止画サムネイル（`thumb.webp`）を作る。そのあともう一度 `build-manifest.mjs` を流す。
4. `node tools/effect-apng-maker/scripts/check-sizes.mjs [id,id]` … 初期設定で書き出して容量を確かめる（Playwright が必要。4MB 超で失敗）。
5. PR にする。`status` は `test`（いまは全件）→ 一般公開のときに `public`。`draft` はライブラリに出ない。

### render.js の決まりごと

```js
export default {
  setup(params, S) { return state; },              // 任意。S = { w, h, duration, fps, play, seed }
  draw(ctx, t, params, state, S) { },              // 演出（type: "effect"）。t は 0..1
  cover(ctx, p, params, state, S) { }              // 転換（type: "transition"）。p=0 何もなし → p=1 全面を覆う
};
```

- 大きさは `S.h / 540` を単位にする（プレビューと書き出しで見た目が同じになる）。
- 乱数は `rng(S.seed)` だけを使う（プレビューと書き出しが同じ絵になる）。
- ループでは t=0 と t=1 が同じ絵になるように、動きを整数回の周回で作る（`kit.js` の `cycles` / `wrap`）。
- 転換の in / out / inout は本体が `p` を作るので、`cover` は「覆う量 p」だけを描けばよい。
- `kind: "combo"` は `layers` に既存のアセットを並べるだけ（例：嵐 = 雨＋風＋雷光）。
- `setup` は async にしてよい（本体が await する）。
- 1コマを描くのが重い（プレビューの大きさで 18ms 超）ものは、プレビューでは前もって描きためてから再生する（本体が自動で測る）。
  最初の1コマの下ごしらえだけで重いと分かっているものは `asset.json` に `"heavy": true` を書くと、測らずに描きためる。
- 長さの初期値：新しく足す場面転換は 2 秒までを目安にする（すでに 2 秒以下のものはそのまま）。演出も、よほど長い流れでない限り 4 秒以内にする（TK 2026-11-14）。

### 文字画像APNGメーカーEX の演出を使う

`ex/` に EX のエンジンと演出部品（`fx-*.js`、2026-11-10 の f3baa73 時点のコピー）を置いている。`library/ex-bridge.js` が必要になったときだけ読み込む。

- EX のテンプレートをそのまま使う（戦闘演出・炎・灰・煙など）：
  `export default exTemplate({ template: 'fireWall' })`、色違いは `exTemplate({ variants: { white: 'fangFxWhite', red: 'fangFxRed' } })`（`variant` という select の設定で選ぶ）。
  文字は透明にして描く。EX の1回ぶんの長さを、こちらの「長さ」に引きのばして再生する。
- 部品だけ使う（コウモリ・月・血しぶき・かぼちゃ・おばけ・流れ星など）：`const ex = await loadEx();` のあと `ex.Vampire.bat(...)` などを呼ぶ（`setup` を async にする）。
- EX 側を直したときは `ex/` にコピーし直し、`ex-bridge.js` の `EX_VERSION` を上げる。

### EX のテーマ別素材（雨・雪・霧・風・雷・氷・水・魔法など）を使う

元はプロジェクトのファイル `text-apng-maker-ex/themes/<テーマ>/src/*.js`。`ex/themes/` に英字のファイル名で写し、`library/theme-bridge.js` が必要になったときだけ読み込む。
どのコードも `FX.draw(ctx, 幅, 高さ, 秒, 設定)` の形で `window.FX` を上書きし合うので、ファイルごとに別の入れ物で動かしている。

- `export default themeAsset({ file: 'rain', opts: (P, S, box) => ({ level: 3 }), mirror: P => P.dir === 'left' })`
- 1ループ＝アセットの長さ（設定の `loop` に長さを渡す）。元の長さが決まっている一回ものは `time: t => t * 3` のように渡す。
- `scaleLayers(box.RAIN_PRESETS[lv], P.amount)` で粒の数を増減できる。
- 移し替えの計画と残り：https://claude.ai/artifact/FFUuRBa9C6oB74BGL1YZQu
- 1コマが重いものは `res: 0.5` のように内部の大きさを下げて描ける（引きのばして重ねる）。いまは 氷_端から凍りつく（0.65）と 黒雲の稲光（0.5）。
- `with (window)` で動かすと名前を引くたびに遅くなる（数十倍）ので使わない。コードが `window.X =` で置く名前は、`theme-bridge.js` が変数として用意する。
- 元のコードを直したときは `ex/themes/` に写し直し、`theme-bridge.js` の `THEME_VERSION` を上げる。

### 描画コードのない APNG（コマ画像）を使う

斬撃・ナナメ／弧のように、EX で APNG だけが残っているものは、コマを 960×540 に縮めて横4列に並べたシート（`frames.webp`）にして、`library/frames.js` の `frameAsset({ src, n, cols, fw, fh })` で描く。
`P.color` で色を変えられる（`blue` 元の色 / `white` / `red` / `black`）。

## 共通コード

`js/apng-encoder.js` と `js/webp-encoder.js` は 文字画像APNGメーカー のものをそのままコピーしている。
`assets/js/` への共通化（EX の `fx-*.js` も含む）は後の段階で行う（TK 2026-11-14）。
