# 演出APNGメーカー（Effect APNG Maker / 연출 APNG 메이커）

場面転換・天候・ホラー演出などのAPNG素材を、ライブラリから選んで調整し、ココフォリアの部屋で使える形で書き出すツール。
v0.11 は限定テスト版（`noindex`、ポータルのカードなし、直リンクのみ）。

## 画面

| パネル | 役割 |
| --- | --- |
| アセットライブラリ（左） | カテゴリ・検索（日英韓の名前とタグ）・絞り込み（転換／ループ／1回／★お気に入り）。カードにマウスを乗せると動く |
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
    asset.json             名前（ja/en/ko）、タグ、再生、長さ、設定項目、書き出しの初期値、ライセンス
    render.js              描画（procedural のとき）
```

1. 近いアセットのフォルダをコピーして `asset.json` と `render.js` を書き換える。
2. `node tools/effect-apng-maker/scripts/build-manifest.mjs` … `asset.json` を検査して `manifest.json` を作る（`--check` で検査だけ）。
3. `node tools/effect-apng-maker/scripts/check-sizes.mjs [id,id]` … 初期設定で書き出して容量を確かめる（Playwright が必要。4MB 超で失敗）。
4. PR にする。`status` は `test`（いまは全件）→ 一般公開のときに `public`。`draft` はライブラリに出ない。

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

## 共通コード

`js/apng-encoder.js` と `js/webp-encoder.js` は 文字画像APNGメーカー のものをそのままコピーしている。
`assets/js/` への共通化（EX の `fx-*.js` も含む）は後の段階で行う（TK 2026-11-14）。
