/*
 * 文字画像APNGメーカーEX — テキストアニメーションエンジン
 *  - レイアウト（横書き / 縦書き、禁則つき自動改行、自動縮小）
 *  - タイムライン（メッセージ / トレイラー / 場所・時間テロップ）
 *  - エフェクト（1文字ごと / ブロック全体 / 表示中）
 *  - 文字スプライトのキャッシュと描画
 * 同じ時刻を描けば必ず同じ絵になる（乱数は時刻とインデックスから決定）ため、
 * プレビューと書き出しの見た目が一致します。
 */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ================= イージング ================= */

  const EASE = {
    linear: t => t,
    inQuad: t => t * t,
    outQuad: t => 1 - (1 - t) * (1 - t),
    inCubic: t => t * t * t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: t => 1 - Math.pow(1 - t, 4),
    outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outBack: t => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: t => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;
    },
    outBounce: t => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
      if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
      t -= 2.625 / d1;
      return n1 * t * t + 0.984375;
    }
  };

  // UIで選べるイージング → 実体
  const EASING_CHOICES = {
    auto: null,
    linear: 'linear',
    smooth: 'inOutCubic',
    out: 'outCubic',
    strong: 'outExpo',
    back: 'outBack',
    elastic: 'outElastic',
    bounce: 'outBounce',
    in: 'inCubic'
  };

  /* ================= 決定的な乱数 ================= */

  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function rnd(a, b = 0, c = 0) {
    return hash32(a, b, c) / 4294967296;
  }

  function noise1(x, seed) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return lerp(rnd(i, seed, 7), rnd(i + 1, seed, 7), u) * 2 - 1;
  }

  /* ================= 文字処理 ================= */

  const segmenter = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
    ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
    : null;

  function graphemes(text) {
    if (!text) return [];
    if (segmenter) return Array.from(segmenter.segment(text), s => s.segment);
    return Array.from(text);
  }

  const setOf = str => new Set(Array.from(str));
  const V_ROTATE = setOf('ー－―—‐‑–-～〜~…‥（）()「」『』【】〔〕［］[]｛｝{}〈〉《》<>＜＞＝=：:；;｜|→←');
  const V_PUNCT = setOf('、。，．');
  const V_SMALL = setOf('ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ');
  const V_SIDEWAYS = /^[\u0020-\u024f\u0370-\u04ff\u2010-\u2015\u2018-\u201f]$/;
  const NO_LINE_START = setOf('、。，．・：；？！゛゜ヽヾゝゞ々ー）］｝」』】〉》〕…‥ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ!),.:;?]}’”%％');
  const NO_LINE_END = setOf('（［｛「『【〈《〔([{‘“');
  const PAUSE_SHORT = setOf('、，,・');
  const PAUSE_LONG = setOf('。．.！？!?…‥―');

  // 「中央に1文字ずつ」：全文が出た瞬間の衝撃の長さ（秒）・中央の大きな文字の画像を残しておく上限（画素数）
  const SOLO_PUNCH = 0.26;
  // 退場「斬られて左右へ」：切れる瞬間 / 上下がずれ始める瞬間（退場の時間に対する割合）
  const SPLIT_CUT = 0.15;
  const SPLIT_SLIDE = 0.4;
  const SOLO_CACHE_PIXELS = 24e6;
  // 書き出しのフレーム時刻がちょうど切り替わりの瞬間に来ても、丸め誤差で1コマずれないようにする幅
  const TIME_EPS = 1e-6;
  // 「中央から左右に広がる」：重なった文字が現れるまでの時間（秒）と、重なりのばらけ具合。
  // 本来の位置までの距離の SPREAD_LOOSE 割だけ左右にずらして重ねる（0 だと中央の一点に集まる）。
  // ただし重なりの広がり（中央から片側）は文字の大きさの SPREAD_REACH 倍までにして、長い行でも中央にまとめる
  const SPREAD_APPEAR = 0.25;
  const SPREAD_LOOSE = 0.2;
  const SPREAD_REACH = 0.9;
  // 表示中の「点滅」：1回の周期（秒）と、その中で付いている割合
  const BLINK_PERIOD = 0.5;
  const BLINK_ON = 0.6;

  const isBlank = ch => ch === ' ' || ch === '　' || ch === '\t' || /^\s+$/.test(ch);
  // ハングルも英単語と同じく、単語（空白で区切られたまとまり）の途中では改行しない
  const isWordChar = ch => /^[A-Za-z0-9'’\-_.,!?&:;%$#@/\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff]$/.test(ch);

  // 禁則処理つきの自動改行（英単語は分割しない）
  function wrapParagraph(chars, maxW, measure, lsPx) {
    if (!chars.length) return [[]];
    const widthOf = arr => (arr.length ? measure(arr.join('')) + lsPx * (arr.length - 1) : 0);
    const tokens = [];
    let word = null;
    chars.forEach(ch => {
      if (isWordChar(ch)) {
        if (!word) { word = []; tokens.push(word); }
        word.push(ch);
      } else {
        word = null;
        tokens.push([ch]);
      }
    });
    const expanded = [];
    tokens.forEach(tok => {
      if (tok.length > 1 && widthOf(tok) > maxW) tok.forEach(ch => expanded.push([ch]));
      else expanded.push(tok);
    });
    const lines = [];
    let cur = [];
    for (let i = 0; i < expanded.length; i++) {
      const tok = expanded[i];
      const tokIsBlank = tok.length === 1 && isBlank(tok[0]);
      if (!cur.length && tokIsBlank && lines.length) continue;
      const candidate = cur.concat(tok);
      if (cur.length && widthOf(candidate) > maxW) {
        if (tok.length === 1 && NO_LINE_START.has(tok[0])) {
          lines.push(candidate);
          cur = [];
          continue;
        }
        const carry = [];
        while (cur.length > 1 && NO_LINE_END.has(cur[cur.length - 1])) carry.unshift(cur.pop());
        while (cur.length && isBlank(cur[cur.length - 1])) cur.pop();
        lines.push(cur);
        cur = carry;
        if (tokIsBlank && !cur.length) continue;
        cur = cur.concat(tok);
      } else {
        cur = candidate;
      }
    }
    if (cur.length || !lines.length) lines.push(cur);
    return lines;
  }

  /* ================= エフェクト定義 ================= */
  // st: 1文字の状態 / bs: ブロック全体の状態
  // e: イージング後の進捗, p: 生の進捗, g: 文字情報, k: 強さ, info: { size, t, dir, vertical }

  const IN_EFFECTS = [
    { id: 'fade', level: 'glyph', ease: 'outCubic', dur: 0.6, stagger: 0,
      glyph(st, e) { st.a *= e; } },
    { id: 'rise', level: 'glyph', ease: 'outCubic', dur: 0.8, stagger: 0.06,
      glyph(st, e, p, g, k) { st.a *= e; st.y += (1 - e) * 0.55 * g.size * k; } },
    { id: 'drop', level: 'glyph', ease: 'outCubic', dur: 0.8, stagger: 0.06,
      glyph(st, e, p, g, k) { st.a *= e; st.y -= (1 - e) * 0.55 * g.size * k; } },
    { id: 'converge', level: 'glyph', ease: 'outCubic', dur: 0.9, stagger: 0.1,
      glyph(st, e, p, g, k, info) {
        const sign = g.parity ? 1 : -1;
        const d = (1 - e) * 0.6 * g.size * k * sign;
        if (info.vertical) st.x -= d; else st.y += d;
        st.a *= e;
      } },
    { id: 'slide', level: 'glyph', ease: 'outCubic', dur: 0.7, stagger: 0.04, dirs: ['left', 'right', 'up', 'down'],
      glyph(st, e, p, g, k, info) {
        const d = (1 - e) * 1.1 * g.size * k;
        const dir = info.dir || 'left';
        if (dir === 'left') st.x -= d; else if (dir === 'right') st.x += d; else if (dir === 'up') st.y -= d; else st.y += d;
        st.a *= e;
      } },
    { id: 'tracking', level: 'glyph', ease: 'outCubic', dur: 1.4, stagger: 0,
      glyph(st, e, p, g, k, info) {
        const d = g.lineOffset * (1 - e) * 1.6 * k;
        if (info.vertical) st.y += d; else st.x += d;
        st.a *= e;
      } },
    // 行の文字を行の中央に（少し左右にばらけて）重ねて出し、少し見せてから行の向きに広げる（トレイラーには同じ名前の「表示の流れ」がある）
    { id: 'spread', level: 'glyph', ease: 'outQuart', dur: 1.3, stagger: 0, noTrailer: true,
      glyph(st, e, p, g, k, info) {
        const appear = clamp(p / 0.18);
        const q = clamp((p - 0.42) / 0.58);
        const m = info.ease ? info.ease(q) : EASE.outQuart(q);
        const d = -g.lineOffset * (1 - m) * (1 - spreadLoose(g.lineReach, g.size));
        if (info.vertical) st.y += d; else st.x += d;
        st.a *= EASE.outQuad(appear) * lerp(stackAlpha(g), 1, m);
        st.s *= 1 + 0.25 * k * (1 - EASE.outCubic(appear));
      } },
    { id: 'blurIn', level: 'glyph', ease: 'outCubic', dur: 0.8, stagger: 0.05,
      glyph(st, e, p, g, k) { st.blur += (1 - e) * 0.28 * g.size * k; st.a *= e; } },
    { id: 'pop', level: 'glyph', ease: 'outBack', dur: 0.5, stagger: 0.07,
      glyph(st, e, p) { st.s *= Math.max(0.001, e); st.a *= clamp(p * 3); } },
    { id: 'shrinkIn', level: 'glyph', ease: 'outCubic', dur: 0.55, stagger: 0.06,
      glyph(st, e, p, g, k) { st.s *= 1 + (1 - e) * 1.6 * k; st.a *= e; } },
    { id: 'spin', level: 'glyph', ease: 'outCubic', dur: 0.8, stagger: 0.06,
      glyph(st, e, p, g, k) { st.r += (1 - e) * -Math.PI * 0.8 * k; st.s *= 0.3 + 0.7 * e; st.a *= e; } },
    { id: 'flip', level: 'glyph', ease: 'outBack', dur: 0.6, stagger: 0.06,
      glyph(st, e, p, g, k, info) {
        if (info.vertical) st.sx *= Math.max(0.001, e); else st.sy *= Math.max(0.001, e);
        st.a *= clamp(p * 2.5);
      } },
    { id: 'bounce', level: 'glyph', ease: 'outBounce', dur: 0.9, stagger: 0.07,
      glyph(st, e, p, g, k) { st.y -= (1 - e) * 1.3 * g.size * k; st.a *= clamp(p * 6); } },
    { id: 'scatter', level: 'glyph', ease: 'outCubic', dur: 1.1, stagger: 0.02,
      glyph(st, e, p, g, k) {
        const ang = g.r1 * TAU;
        const dist = (1.4 + g.r2 * 1.8) * g.size * k * (1 - e);
        st.x += Math.cos(ang) * dist;
        st.y += Math.sin(ang) * dist;
        st.r += (g.r3 - 0.5) * 2.4 * (1 - e);
        st.a *= e;
      } },
    { id: 'typewriter', level: 'glyph', ease: 'linear', dur: 0, stagger: 0.08,
      glyph() {} },
    { id: 'flicker', level: 'glyph', ease: 'linear', dur: 0.9, stagger: 0.05,
      glyph(st, e, p, g) { st.a *= flickerCurve(p, g.seed); } },
    { id: 'slam', level: 'block', ease: 'linear', dur: 0.75,
      block(bs, e, p, k, info) {
        const impact = 0.4;
        if (p < impact) {
          const q = p / impact;
          bs.s *= 1 + (1 - q * q) * 2.4 * k;
          bs.a *= clamp(q * 2.2);
          bs.blur += (1 - q) * 0.04 * info.size;
        } else {
          const q = (p - impact) / (1 - impact);
          const decay = Math.pow(1 - q, 2);
          bs.s *= 1 + Math.sin(q * Math.PI * 3) * 0.05 * decay * k;
          const amp = 0.08 * info.size * decay * k;
          bs.x += noise1(info.t * 42, 11) * amp;
          bs.y += noise1(info.t * 42, 29) * amp;
          bs.bright = Math.max(bs.bright, Math.pow(1 - q, 3) * 0.85);
        }
      } },
    { id: 'zoomIn', level: 'block', ease: 'outCubic', dur: 0.9,
      block(bs, e, p, k, info) { bs.s *= 1 + (1 - e) * 0.9 * k; bs.a *= e; bs.blur += (1 - e) * 0.1 * info.size * k; } },
    { id: 'emerge', level: 'block', ease: 'outCubic', dur: 0.9,
      block(bs, e, p, k) { bs.s *= Math.max(0.05, 1 - (1 - e) * 0.6 * k); bs.a *= e; } },
    { id: 'wipe', level: 'block', ease: 'inOutCubic', dur: 0.9, dirs: ['lr', 'rl', 'tb', 'bt', 'center'],
      block(bs, e, p, k, info) { bs.mask = { dir: info.dir || 'lr', p: e, out: false }; } },
    { id: 'shutter', level: 'block', ease: 'outExpo', dur: 0.6, dirs: ['v', 'h'],
      block(bs, e, p, k, info) {
        if (info.dir === 'h') bs.sx *= Math.max(0.001, e); else bs.sy *= Math.max(0.001, e);
        bs.a *= clamp(e * 1.6);
      } },
    { id: 'glitch', level: 'block', ease: 'linear', dur: 0.9,
      block(bs, e, p, k, info) {
        const frame = Math.floor(info.t * 24);
        bs.glitch = Math.max(bs.glitch, (1 - p) * k);
        bs.a *= p > 0.8 ? 1 : (rnd(frame, 3, info.seed) < 0.3 + 0.6 * p ? 1 : 0.12);
        bs.x += (rnd(frame, 7, info.seed) - 0.5) * 0.18 * info.size * (1 - p) * k;
      } },
    { id: 'flash', level: 'block', ease: 'outCubic', dur: 0.8,
      block(bs, e, p) { bs.a *= clamp(p * 5); bs.bright = Math.max(bs.bright, 1 - e); bs.glowMul *= 1 + (1 - e) * 1.5; } }
  ];

  const OUT_EFFECTS = [
    { id: 'none', level: 'none', ease: 'linear', dur: 0 },
    { id: 'fade', level: 'glyph', ease: 'inCubic', dur: 0.6, stagger: 0,
      glyph(st, e) { st.a *= 1 - e; } },
    { id: 'rise', level: 'glyph', ease: 'inCubic', dur: 0.8, stagger: 0.04,
      glyph(st, e, p, g, k) { st.a *= 1 - e; st.y -= e * 0.55 * g.size * k; } },
    { id: 'sink', level: 'glyph', ease: 'inCubic', dur: 0.8, stagger: 0.04,
      glyph(st, e, p, g, k) { st.a *= 1 - e; st.y += e * 0.55 * g.size * k; } },
    { id: 'diverge', level: 'glyph', ease: 'inCubic', dur: 0.8, stagger: 0.06,
      glyph(st, e, p, g, k, info) {
        const sign = g.parity ? 1 : -1;
        const d = e * 0.6 * g.size * k * sign;
        if (info.vertical) st.x -= d; else st.y += d;
        st.a *= 1 - e;
      } },
    { id: 'slide', level: 'glyph', ease: 'inCubic', dur: 0.7, stagger: 0.03, dirs: ['left', 'right', 'up', 'down'],
      glyph(st, e, p, g, k, info) {
        const d = e * 1.1 * g.size * k;
        const dir = info.dir || 'left';
        if (dir === 'left') st.x -= d; else if (dir === 'right') st.x += d; else if (dir === 'up') st.y -= d; else st.y += d;
        st.a *= 1 - e;
      } },
    { id: 'tracking', level: 'glyph', ease: 'inCubic', dur: 1.2, stagger: 0,
      glyph(st, e, p, g, k, info) {
        const d = g.lineOffset * e * 1.6 * k;
        if (info.vertical) st.y += d; else st.x += d;
        st.a *= 1 - e;
      } },
    { id: 'blurOut', level: 'glyph', ease: 'inCubic', dur: 0.8, stagger: 0.03,
      glyph(st, e, p, g, k) { st.blur += e * 0.28 * g.size * k; st.a *= 1 - e; } },
    { id: 'growOut', level: 'glyph', ease: 'inCubic', dur: 0.6, stagger: 0.04,
      glyph(st, e, p, g, k) { st.s *= 1 + e * 1.3 * k; st.a *= 1 - e; } },
    { id: 'shrink', level: 'glyph', ease: 'inCubic', dur: 0.6, stagger: 0.04,
      glyph(st, e) { st.s *= Math.max(0.001, 1 - e * 0.95); st.a *= 1 - e * e; } },
    { id: 'scatter', level: 'glyph', ease: 'inCubic', dur: 1.0, stagger: 0.02,
      glyph(st, e, p, g, k) {
        const ang = g.r1 * TAU;
        const dist = (1.4 + g.r2 * 1.8) * g.size * k * e;
        st.x += Math.cos(ang) * dist;
        st.y += Math.sin(ang) * dist;
        st.r += (g.r3 - 0.5) * 2.4 * e;
        st.a *= 1 - e;
      } },
    { id: 'erase', level: 'glyph', ease: 'linear', dur: 0, stagger: 0.06 },
    { id: 'flicker', level: 'glyph', ease: 'linear', dur: 0.8, stagger: 0.04,
      glyph(st, e, p, g) { st.a *= flickerCurve(1 - p, g.seed + 101); } },
    { id: 'zoomThrough', level: 'block', ease: 'inCubic', dur: 0.6,
      block(bs, e, p, k, info) { bs.s *= 1 + e * 0.9 * k; bs.a *= 1 - e; bs.blur += e * 0.1 * info.size * k; } },
    { id: 'recede', level: 'block', ease: 'inCubic', dur: 0.7,
      block(bs, e, p, k) { bs.s *= Math.max(0.05, 1 - e * 0.6 * k); bs.a *= 1 - e; } },
    { id: 'wipe', level: 'block', ease: 'inOutCubic', dur: 0.8, dirs: ['lr', 'rl', 'tb', 'bt', 'center'],
      block(bs, e, p, k, info) { bs.mask = { dir: info.dir || 'lr', p: e, out: true }; } },
    { id: 'shutter', level: 'block', ease: 'inExpo', dur: 0.5, dirs: ['v', 'h'],
      block(bs, e, p, k, info) {
        if (info.dir === 'h') bs.sx *= Math.max(0.001, 1 - e); else bs.sy *= Math.max(0.001, 1 - e);
        bs.a *= clamp((1 - e) * 1.6);
      } },
    { id: 'glitch', level: 'block', ease: 'linear', dur: 0.8,
      block(bs, e, p, k, info) {
        const frame = Math.floor(info.t * 24);
        bs.glitch = Math.max(bs.glitch, p * k);
        bs.a *= (1 - Math.pow(p, 3)) * (p < 0.15 ? 1 : (rnd(frame, 5, info.seed) < 0.85 - 0.6 * p ? 1 : 0.1));
        bs.x += (rnd(frame, 9, info.seed) - 0.5) * 0.18 * info.size * p * k;
      } },
    // 斬られて左右へ（EX）：文字の中央の高さで横に切れて少しずれ、ひと呼吸おいてから
    // 上半分は右へ、下半分は左へずれて消える。切れる瞬間・ずれ始める瞬間は時間の割合で決まっている
    { id: 'split', level: 'block', ease: 'linear', dur: 1.4,
      block(bs, e, p, k, info) {
        if (p < SPLIT_CUT) return;
        const q = clamp((p - SPLIT_SLIDE) / (1 - SPLIT_SLIDE));
        bs.split = Math.max(bs.split, info.size * (0.08 + 4 * EASE.inCubic(q)) * k);
        bs.splitGap = Math.max(bs.splitGap, info.size * 0.03 * k);
        bs.a *= 1 - clamp((q - 0.35) / 0.65);
      } },
    // 燃えて消える：燃え際が左から右へ進み、そこより左が消える（炎の演出があれば燃え際に火が立つ）
    { id: 'burn', level: 'block', ease: 'linear', dur: 1.1,
      block(bs, e) { bs.mask = { dir: 'burn', p: e, out: true }; } },
    // 光の粒になって消える（EX）：左から右へ文字がほどけて、蛍のような光の粒になり、右へ漂いながら消える。
    // 退場の時間のうち、はじめの FIREFLY_SWEEP の割合で文字がほどけ、残りで光の粒が消えていく
    { id: 'firefly', level: 'block', ease: 'linear', dur: 2.6,
      block(bs, e, p) { bs.mask = { dir: 'burn', p: clamp(p / FIREFLY_SWEEP), out: true, firefly: true }; } },
    // 星屑になって消える（EX）：文字が細かな粒にほどけ、粒はまたたきながら漂って消える（星の判定では、失敗は鈍い粉になって落ち、
    // 致命的失敗はブラックホールへ渦を巻いて吸い込まれる）。退場の時間のうち、はじめの STARDUST_SWEEP の割合で粒が生まれる
    { id: 'stardust', level: 'block', ease: 'linear', dur: 2.0,
      block(bs, e, p) {
        bs.mask = { stardust: true, p };
        // 粒が抜けたあとに残ったところは、ほどけ終わるころまでに薄れて消える
        bs.a *= 1 - EASE.inOutCubic(clamp((p - STARDUST_SWEEP * 0.45) / (STARDUST_SWEEP * 0.75)));
        if (p < 0.12) bs.bright = Math.max(bs.bright, 0.35 * Math.sin(Math.PI * p / 0.12));
      } },
    // 文字が灰になって消える（EX）：左下から右上へ前線が渡り、通ったところの文字は焦げて崩れ、灰のかけらになって風に流れて消える。
    // ashtext は灰褐色の灰、ashtextBlack は黒い灰。退場の時間のうち、はじめの ASHTEXT_SWEEP の割合で前線が文字を渡る
    { id: 'ashtext', level: 'block', ease: 'linear', dur: 4.0,
      block(bs, e, p) { bs.mask = { ashtext: true, p, black: false }; } },
    { id: 'ashtextBlack', level: 'block', ease: 'linear', dur: 4.0,
      block(bs, e, p) { bs.mask = { ashtext: true, p, black: true }; } },
    // 炎に包まれて燃え尽きる（EX）：左から右へ火が燃え移り、燃え際は焦げて赤く光りながら崩れ、
    // 文字から炎が立ちのぼって火の粉と煙が昇る。退場の時間のうち、はじめの BLAZE_SWEEP の割合で燃え移り、残りで火が収まる
    { id: 'blaze', level: 'block', ease: 'linear', dur: 3.0,
      block(bs) { bs.mask = { blaze: true }; } }
  ];

  const HOLD_EFFECTS = [
    { id: 'none' },
    { id: 'float', block(bs, t, k, info) { bs.y += Math.sin(TAU * t / 2.6) * 0.05 * info.size * k; } },
    { id: 'wave', glyph(st, t, g, k) { st.y += Math.sin(TAU * t / 1.6 - g.vis * 0.6) * 0.07 * g.size * k; } },
    { id: 'pulse', block(bs, t, k) {
      const c = (t % 1.1) / 1.1;
      const beat = Math.exp(-Math.pow((c - 0.1) / 0.06, 2)) + 0.6 * Math.exp(-Math.pow((c - 0.3) / 0.06, 2));
      bs.s *= 1 + beat * 0.035 * k;
    } },
    { id: 'shake', block(bs, t, k, info) {
      const f = Math.floor(t * 20);
      bs.x += (rnd(f, 1, info.seed) - 0.5) * 0.05 * info.size * k;
      bs.y += (rnd(f, 2, info.seed) - 0.5) * 0.05 * info.size * k;
    } },
    { id: 'glow', block(bs, t, k) { bs.glowMul *= clamp(1 - 0.45 * k * (0.5 + 0.5 * Math.cos(TAU * t / 1.8)), 0, 2); } },
    { id: 'flicker', block(bs, t, k, info) {
      const f = Math.floor(t * 12);
      if (rnd(f, 5, info.seed) < 0.09 * k) bs.layerAlpha *= 0.2 + rnd(f, 6, info.seed) * 0.35;
    } },
    // 点滅：登場し終えてから一定の間隔で消えたり付いたりする（装飾は消さない）。強さで、消えている間の薄さが変わる
    { id: 'blink', block(bs, t, k, info) {
      const since = info.since ?? t;
      if (since < 0) return;
      const c = (since % BLINK_PERIOD) / BLINK_PERIOD;
      if (c >= BLINK_ON) bs.layerAlpha *= clamp(1 - 0.85 * k);
    } },
    { id: 'glitch', block(bs, t, k) {
      const c = t % 1.7;
      if (c < 0.14) bs.glitch = Math.max(bs.glitch, 0.55 * k);
    } }
  ];

  const byId = list => list.reduce((map, item) => { map[item.id] = item; return map; }, {});
  const IN_MAP = byId(IN_EFFECTS);
  const OUT_MAP = byId(OUT_EFFECTS);
  const HOLD_MAP = byId(HOLD_EFFECTS);

  function flickerCurve(p, seed) {
    if (p >= 1) return 1;
    if (p <= 0) return 0;
    const step = Math.floor(p * 16);
    const on = rnd(step, seed, 13) < 0.25 + p * 0.85;
    return on ? 0.35 + 0.65 * p : 0.05 * p;
  }

  // 効果ごとに使える方向だけを通す（別の効果で選んだ方向が残っていても破綻しない）
  // 「中央から左右に広がる」で重なるときのばらけ具合（reach：行の中で中央からいちばん遠い文字までの距離）
  function spreadLoose(reach, size) {
    return reach > 0 ? Math.min(SPREAD_LOOSE, SPREAD_REACH * size / reach) : SPREAD_LOOSE;
  }

  // 「中央から左右に広がる」で重なっている間の不透明度（文字が多い行ほど薄くして、重なりが透けて見えるようにする）
  function stackAlpha(g) {
    return clamp(1.8 / Math.sqrt(Math.max(1, g.lineCount || 1)), 0.3, 1);
  }

  function dirFor(fx, dir) {
    if (!fx || !fx.dirs) return dir;
    return fx.dirs.includes(dir) ? dir : fx.dirs[0];
  }

  function easeFn(choice, fallback) {
    const key = EASING_CHOICES[choice] || fallback || 'outCubic';
    return EASE[key] || EASE.outCubic;
  }

  /* ================= フォント文字列 ================= */

  function cssFontFamily(families) {
    return families.map(f => (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/.test(f) ? f : `"${String(f).replace(/"/g, '')}"`)).join(', ');
  }

  function fontString(families, weight, size, italic) {
    return `${italic ? 'italic ' : ''}${weight || 400} ${Math.max(1, size).toFixed(2)}px ${cssFontFamily(families)}`;
  }

  /* ================= レイアウト ================= */

  function splitPages(scene) {
    const text = String(scene.text || '').replace(/\r\n?/g, '\n');
    const sub = scene.mode === 'trailer' ? '' : String(scene.subText || '').replace(/\r\n?/g, '\n');
    let pages;
    if (scene.mode === 'trailer' && scene.pageSplit && scene.reveal !== 'scroll') {
      pages = text.split(/\n[ \t　]*\n+/).map(s => s.replace(/^\n+|\n+$/g, '')).filter(s => s.length);
      if (!pages.length) pages = [''];
    } else {
      pages = [text];
    }
    return pages.map((body, index) => ({
      main: body.split('\n').map(line => graphemes(line)),
      sub: index === 0 && sub.trim() ? sub.split('\n').map(line => graphemes(line)) : []
    }));
  }

  function measureInk(ctx, str, size) {
    const m = ctx.measureText(str);
    const a = Number.isFinite(m.actualBoundingBoxAscent) ? m.actualBoundingBoxAscent : size * 0.8;
    const d = Number.isFinite(m.actualBoundingBoxDescent) ? m.actualBoundingBoxDescent : size * 0.12;
    return { width: m.width, a, d };
  }

  function layoutGroup(lines, spec, ctx) {
    const { font, size, ls, lh, align, vertical, wrapChars } = spec;
    const lsPx = ls * size;
    const alignF = align === 'start' ? 0 : align === 'end' ? 1 : 0.5;
    ctx.font = font;
    const glyphs = [];
    const lineInfos = [];

    if (!vertical) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      const measure = s => ctx.measureText(s).width;
      let wrapped = [];
      lines.forEach(chars => {
        if (wrapChars > 0) wrapped = wrapped.concat(wrapParagraph(chars, wrapChars * size * (1 + ls), measure, lsPx));
        else wrapped.push(chars);
      });
      const pitch = lh * size;
      let maxW = 0;
      const rows = wrapped.map((chars, li) => {
        const widths = [0];
        let acc = '';
        chars.forEach(ch => { acc += ch; widths.push(measure(acc)); });
        const visible = chars.some(ch => !isBlank(ch));
        const ink = visible ? measureInk(ctx, acc, size) : { a: size * 0.72, d: size * 0.12 };
        const lineW = chars.length ? widths[chars.length] + lsPx * (chars.length - 1) : 0;
        maxW = Math.max(maxW, lineW);
        return { chars, widths, lineW, baseline: li * pitch, inkA: ink.a, inkD: ink.d, visible };
      });
      let y0 = Infinity, y1 = -Infinity;
      rows.forEach(row => {
        if (!row.visible) return;
        y0 = Math.min(y0, row.baseline - row.inkA);
        y1 = Math.max(y1, row.baseline + row.inkD);
      });
      if (!Number.isFinite(y0)) { y0 = -size * 0.8; y1 = size * 0.2; }
      rows.forEach((row, li) => {
        const x0 = (maxW - row.lineW) * alignF;
        const lineCenter = x0 + row.lineW / 2;
        const midOffset = (row.inkA - row.inkD) / 2;
        const lineIdx = [];
        row.chars.forEach((ch, i) => {
          const penX = x0 + row.widths[i] + lsPx * i;
          const adv = row.widths[i + 1] - row.widths[i];
          const cx = penX + adv / 2;
          const cy = row.baseline - midOffset;
          lineIdx.push(glyphs.length);
          glyphs.push({
            ch, blank: isBlank(ch), line: li, col: i, size, vertical: false, rot: false,
            cx, cy, ox: -adv / 2, oy: midOffset, adv,
            lineOffset: cx - lineCenter,
            linePos: row.lineW > 0 ? (penX - x0) / row.lineW : 0,
            penX, baseline: row.baseline, inkA: row.inkA, inkD: row.inkD
          });
        });
        setLineReach(glyphs, lineIdx);
        lineInfos.push({ idx: lineIdx, x0, x1: x0 + row.lineW, baseline: row.baseline, inkA: row.inkA, inkD: row.inkD, visible: row.visible });
      });
      let inkA = 0, inkD = 0;
      rows.forEach(row => { if (row.visible) { inkA = Math.max(inkA, row.inkA); inkD = Math.max(inkD, row.inkD); } });
      return { glyphs, lines: lineInfos, box: { x0: 0, y0, x1: maxW, y1 }, metrics: { inkA: inkA || size * 0.8, inkD: inkD || size * 0.12 } };
    }

    // 縦書き：列は右から左、文字は上から下
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let cols = [];
    lines.forEach(chars => {
      if (wrapChars > 0 && chars.length > wrapChars) {
        const out = [];
        let cur = [];
        chars.forEach(ch => {
          if (cur.length >= wrapChars && !NO_LINE_START.has(ch)) {
            const carry = [];
            while (cur.length > 1 && NO_LINE_END.has(cur[cur.length - 1])) carry.unshift(cur.pop());
            out.push(cur);
            cur = carry;
          }
          cur.push(ch);
        });
        out.push(cur);
        cols = cols.concat(out);
      } else {
        cols.push(chars);
      }
    });
    const pitch = lh * size;
    // 半角英数字は横倒し（CSS の text-orientation: mixed と同じ考え方）で、字幅ぶんだけ進める
    const advances = cols.map(chars => chars.map(ch => (V_SIDEWAYS.test(ch) ? ctx.measureText(ch).width : size)));
    const lens = advances.map(list => (list.length ? list.reduce((sum, a) => sum + a, 0) + ls * size * (list.length - 1) : 0));
    const maxLen = Math.max(0, ...lens);
    cols.forEach((chars, ci) => {
      const cxCol = -ci * pitch;
      const top = (maxLen - lens[ci]) * alignF;
      const lineIdx = [];
      const lineCenter = top + lens[ci] / 2;
      let pos = top;
      chars.forEach((ch, j) => {
        const adv = advances[ci][j];
        const center = pos + adv / 2;
        let cx = cxCol;
        let cy = center;
        let rot = false;
        if (V_PUNCT.has(ch)) { cx += size * 0.5; cy -= size * 0.5; }
        else if (V_SMALL.has(ch)) { cx += size * 0.1; cy -= size * 0.1; }
        else if (V_ROTATE.has(ch) || V_SIDEWAYS.test(ch)) rot = true;
        lineIdx.push(glyphs.length);
        glyphs.push({
          ch, blank: isBlank(ch), line: ci, col: j, size, vertical: true, rot,
          cx, cy, ox: 0, oy: 0, adv,
          lineOffset: center - lineCenter,
          linePos: lens[ci] > 0 ? (pos - top) / lens[ci] : 0,
          penX: cxCol, baseline: pos, inkA: size / 2, inkD: size / 2
        });
        pos += adv + ls * size;
      });
      setLineReach(glyphs, lineIdx);
      lineInfos.push({ idx: lineIdx, x0: cxCol - size / 2, x1: cxCol + size / 2, top, bottom: top + lens[ci], visible: chars.some(ch => !isBlank(ch)) });
    });
    const x0 = cols.length ? -(cols.length - 1) * pitch - size / 2 : -size / 2;
    return { glyphs, lines: lineInfos, box: { x0, y0: 0, x1: size / 2, y1: Math.max(maxLen, size * 0.1) }, metrics: { inkA: size / 2, inkD: size / 2 } };
  }

  // 行の中央からいちばん遠い文字までの距離（「中央から左右に広がる」の重なりの広がりに使う）
  function setLineReach(glyphs, idx) {
    const reach = Math.max(0, ...idx.map(i => (glyphs[i].blank ? 0 : Math.abs(glyphs[i].lineOffset))));
    idx.forEach(i => { glyphs[i].lineReach = reach; });
  }

  function shiftGroup(group, dx, dy) {
    group.glyphs.forEach(g => { g.cx += dx; g.cy += dy; g.penX += dx; g.baseline += dy; });
    group.lines.forEach(l => {
      l.x0 += dx; l.x1 += dx;
      if (l.baseline !== undefined) l.baseline += dy;
      if (l.top !== undefined) { l.top += dy; l.bottom += dy; }
    });
    group.box = { x0: group.box.x0 + dx, y0: group.box.y0 + dy, x1: group.box.x1 + dx, y1: group.box.y1 + dy };
  }

  // 縁取り（内側＋外側）の太さ（文字サイズ scene.fontSize 基準の px）
  function outlineWidth(scene) {
    return (scene.stroke && scene.stroke.on ? scene.stroke.width || 0 : 0) + (scene.stroke2 && scene.stroke2.on ? scene.stroke2.width || 0 : 0);
  }

  // 装飾（とEXの演出）がテキストの外側にどれだけはみ出すか
  function decoExtents(scene, size) {
    const a = decoBaseExtents(scene, size);
    const b = sfxExtents(scene, size);
    return { l: Math.max(a.l, b.l), r: Math.max(a.r, b.r), t: Math.max(a.t, b.t), b: Math.max(a.b, b.b) };
  }

  // EXの演出が文字の外側にどれだけ広がるか（自動縮小で画像に収めるため。左右に伸びる飾り線は含めない）
  function sfxExtents(scene, size) {
    switch (sfxOf(scene).type) {
      case 'frame': return { l: size * 0.95, r: size * 0.95, t: size * 0.6, b: size * 0.6 };
      case 'crest': {
        // 紋章は文字の帯の上に載る。下は帯の余白だけ
        return { l: 0, r: 0, t: size * (0.45 + 2.3 * crestScale(sfxOf(scene).power ?? 1)), b: size * 0.35 };
      }
      case 'gunshot': return { l: size, r: size, t: size, b: size * 0.55 };
      case 'flame': return { l: 0, r: 0, t: size * 0.35, b: size * 0.35 };
      case 'cyber': return { l: 0, r: 0, t: size * 0.55, b: size * 0.55 };
      case 'p5round': return { l: size * 0.35, r: size * 0.35, t: size * 0.55, b: size * 0.55 };
      case 'p5round2': return { l: size * 0.3, r: size * 0.3, t: size * 0.7, b: size * 0.7 };
      case 'p5gun': return { l: size * 0.45, r: size * 0.45, t: size * 0.75, b: size * 0.75 };
      case 'blade': return { l: 0, r: 0, t: size * 0.62, b: size * 0.62 };
      case 'shot': return { l: 0, r: 0, t: size * 0.65, b: size * 0.65 };
      case 'star': return { l: 0, r: 0, t: size * 0.65, b: size * 0.65 };
      case 'dream': return { l: 0, r: 0, t: size * 0.75, b: size * 0.75 };
      case 'vampire': return { l: 0, r: 0, t: size * 0.75, b: size * 0.75 };
      case 'fang': return { l: 0, r: 0, t: size * 0.75, b: size * 0.75 };
      case 'fangFx': return { l: 0, r: 0, t: 0, b: 0 };
      case 'clawMark': return { l: 0, r: 0, t: 0, b: 0 };
      case 'katanaFx': return { l: 0, r: 0, t: 0, b: 0 };
      case 'zangekiHard': return { l: 0, r: 0, t: 0, b: 0 };
      case 'bulletMark': return { l: 0, r: 0, t: 0, b: 0 };
      // 燃える文字：炎が字の上へ立ちのぼる分（上に広く空けるので、字は試作と同じく少し下寄りになる）
      case 'fireText': return { l: size * 0.1, r: size * 0.1, t: size * 0.9, b: size * 0.1 };
      case 'fireTextSeq': return { l: size * 0.1, r: size * 0.1, t: size * 0.63, b: size * 0.1 };
      default: return { l: 0, r: 0, t: 0, b: 0 };
    }
  }

  function decoBaseExtents(scene, size) {
    const d = scene.deco || {};
    const pad = (d.pad || 0) * size;
    // 線にも縁取りをつけるときは、その分だけ外側に広がる
    const th = (d.thickness || 0) + (d.outline ? outlineWidth(scene) : 0);
    const ext = (d.extend || 0) * size;
    const v = scene.writing === 'v';
    switch (d.type) {
      case 'box': return { l: pad + th, r: pad + th, t: pad + th, b: pad + th };
      case 'corners': return { l: pad + th, r: pad + th, t: pad + th, b: pad + th };
      case 'lines': return v ? { l: pad + th, r: pad + th, t: ext, b: ext } : { l: ext, r: ext, t: pad + th, b: pad + th };
      case 'underline': return v ? { l: pad + th, r: 0, t: ext, b: ext } : { l: ext, r: ext, t: 0, b: pad + th };
      case 'sides': return v ? { l: 0, r: 0, t: pad + ext, b: pad + ext } : { l: pad + ext, r: pad + ext, t: 0, b: 0 };
      case 'bar': return v ? { l: 0, r: pad + th, t: 0, b: 0 } : { l: pad + th, r: 0, t: 0, b: 0 };
      case 'band': return v ? { l: pad, r: pad, t: 0, b: 0 } : { l: 0, r: 0, t: pad, b: pad };
      // 虎柄テープ：文字の上下（縦書きは左右）にテープの太さ＋余白の分はみ出す。長さ方向は画面の端から端まで
      case 'tape': {
        const tw = d.tapeSize ?? 40;
        return v ? { l: pad + tw, r: pad + tw, t: 0, b: 0 } : { l: 0, r: 0, t: pad + tw, b: pad + tw };
      }
      // タイトル枠：メインの文字の周りに余白分はみ出す。左右（縦書きは上下）の延長は画面内に収めて描く
      case 'frame': return { l: pad + th, r: pad + th, t: pad + th, b: pad + th };
      default: return { l: 0, r: 0, t: 0, b: 0 };
    }
  }

  // 縁取り・光彩・影が文字の外側にどれだけ広がるか（文字サイズ scene.fontSize 基準の px。スプライトの余白と同じ見積もり）
  function effectExtents(scene) {
    const outline = outlineWidth(scene);
    const ext = { l: outline, r: outline, t: outline, b: outline };
    if (scene.glow && scene.glow.on) {
      const g = outline + (scene.glow.size || 0) * 1.25;
      ext.l = Math.max(ext.l, g); ext.r = Math.max(ext.r, g); ext.t = Math.max(ext.t, g); ext.b = Math.max(ext.b, g);
    }
    if (scene.shadow && scene.shadow.on) {
      const blur = (scene.shadow.blur || 0) * 1.25;
      const sx = scene.shadow.x || 0, sy = scene.shadow.y || 0;
      ext.l = Math.max(ext.l, outline + blur - sx);
      ext.r = Math.max(ext.r, outline + blur + sx);
      ext.t = Math.max(ext.t, outline + blur - sy);
      ext.b = Math.max(ext.b, outline + blur + sy);
    }
    return ext;
  }

  function layoutPageAt(pageSpec, scene, env, size) {
    const vertical = scene.writing === 'v';
    const subSize = size * (scene.subSize || 0.35);
    const main = layoutGroup(pageSpec.main, {
      font: env.mainFont(size), size, ls: scene.letterSpacing || 0, lh: scene.lineHeight || 1.4,
      align: scene.align, vertical, wrapChars: scene.mode === 'trailer' ? (scene.wrapChars || 0) : 0
    }, env.ctx);
    let sub = null;
    if (pageSpec.sub.length) {
      sub = layoutGroup(pageSpec.sub, {
        font: env.subFont(subSize), size: subSize, ls: scene.subLetterSpacing || 0, lh: scene.lineHeight || 1.4,
        align: scene.align, vertical, wrapChars: 0
      }, env.ctx);
    }
    const gap = (scene.subGap || 0.3) * size;
    const alignF = scene.align === 'start' ? 0 : scene.align === 'end' ? 1 : 0.5;
    if (sub) {
      if (!vertical) {
        const w = Math.max(main.box.x1 - main.box.x0, sub.box.x1 - sub.box.x0);
        shiftGroup(main, (w - (main.box.x1 - main.box.x0)) * alignF - main.box.x0, 0);
        const subDx = (w - (sub.box.x1 - sub.box.x0)) * alignF - sub.box.x0;
        if (scene.subPosition === 'above') shiftGroup(sub, subDx, main.box.y0 - gap - sub.box.y1);
        else shiftGroup(sub, subDx, main.box.y1 + gap - sub.box.y0);
      } else {
        const h = Math.max(main.box.y1 - main.box.y0, sub.box.y1 - sub.box.y0);
        shiftGroup(main, 0, (h - (main.box.y1 - main.box.y0)) * alignF - main.box.y0);
        const subDy = (h - (sub.box.y1 - sub.box.y0)) * alignF - sub.box.y0;
        if (scene.subPosition === 'above') shiftGroup(sub, main.box.x1 + gap - sub.box.x0, subDy);
        else shiftGroup(sub, main.box.x0 - gap - sub.box.x1, subDy);
      }
    }
    const union = (a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
    const box = sub ? union(main.box, sub.box) : { ...main.box };
    return { main, sub, box, subSize };
  }

  function placePage(page, scene, W, H, size, keep) {
    const ext = decoExtents(scene, size);
    const outer = { x0: page.box.x0 - ext.l, y0: page.box.y0 - ext.t, x1: page.box.x1 + ext.r, y1: page.box.y1 + ext.b };
    const anchor = scene.anchor || 'mc';
    const row = anchor[0], col = anchor[1];
    const mx = scene.marginX || 0, my = scene.marginY || 0;
    let dx, dy;
    if (col === 'l') dx = mx - outer.x0;
    else if (col === 'r') dx = W - mx - outer.x1;
    else dx = W / 2 - (outer.x0 + outer.x1) / 2;
    if (row === 't') dy = my - outer.y0;
    else if (row === 'b') dy = H - my - outer.y1;
    else dy = H / 2 - (outer.y0 + outer.y1) / 2;
    dx += scene.offsetX || 0;
    dy += scene.offsetY || 0;
    if (keep) {
      // 自動縮小がオンのときは、余白の指定はそのままに、装飾・縁取り・光彩・影が画像からはみ出さないよう内側へ寄せる
      const k = size / Math.max(1, scene.fontSize || size);
      const fx = keep.effects;
      if (keep.x) {
        const x0 = page.box.x0 + dx - Math.max(ext.l, fx.l * k);
        const x1 = page.box.x1 + dx + Math.max(ext.r, fx.r * k);
        if (x1 - x0 <= W + 0.5) {
          if (x0 < 0) dx -= x0;
          else if (x1 > W) dx -= x1 - W;
        }
      }
      if (keep.y) {
        const y0 = page.box.y0 + dy - Math.max(ext.t, fx.t * k);
        const y1 = page.box.y1 + dy + Math.max(ext.b, fx.b * k);
        if (y1 - y0 <= H + 0.5) {
          if (y0 < 0) dy -= y0;
          else if (y1 > H) dy -= y1 - H;
        }
      }
    }
    shiftGroup(page.main, dx, dy);
    if (page.sub) shiftGroup(page.sub, dx, dy);
    page.box = { x0: page.box.x0 + dx, y0: page.box.y0 + dy, x1: page.box.x1 + dx, y1: page.box.y1 + dy };
    return { outerW: outer.x1 - outer.x0, outerH: outer.y1 - outer.y0 };
  }

  function computeLayout(scene, env) {
    const W = scene.width, H = scene.height;
    const specs = splitPages(scene);
    const baseSize = Math.max(4, scene.fontSize || 96);
    const vertical = scene.writing === 'v';
    const scrolling = scene.mode === 'trailer' && scene.reveal === 'scroll';
    const availW = Math.max(16, W - 2 * (scene.marginX || 0));
    const availH = Math.max(16, H - 2 * (scene.marginY || 0));

    const autoFit = scene.autoFit !== false;
    const effects = effectExtents(scene);
    let fit = 1;
    if (autoFit) {
      specs.forEach(spec => {
        const probe = layoutPageAt(spec, scene, env, baseSize);
        const ext = decoExtents(scene, baseSize);
        const inkW = probe.box.x1 - probe.box.x0;
        const inkH = probe.box.y1 - probe.box.y0;
        // 文字＋装飾は余白の内側、文字＋装飾＋縁取り・光彩・影は画像の内側に収める（どれも文字サイズに比例）
        const w = inkW + ext.l + ext.r;
        const h = inkH + ext.t + ext.b;
        const wAll = inkW + Math.max(ext.l, effects.l) + Math.max(ext.r, effects.r);
        const hAll = inkH + Math.max(ext.t, effects.t) + Math.max(ext.b, effects.b);
        let f = 1;
        if (!(scrolling && vertical)) {
          if (w > availW) f = Math.min(f, availW / w);
          if (wAll > W) f = Math.min(f, W / wAll);
        }
        if (!(scrolling && !vertical)) {
          if (h > availH) f = Math.min(f, availH / h);
          if (hAll > H) f = Math.min(f, H / hAll);
        }
        fit = Math.min(fit, f);
      });
      fit = Math.max(0.05, fit * (fit < 1 ? 0.985 : 1));
    }
    const keep = autoFit ? { effects, x: !(scrolling && vertical), y: !(scrolling && !vertical) } : null;
    const size = baseSize * fit;
    const glyphs = [];
    const pages = specs.map((spec, index) => {
      const page = layoutPageAt(spec, scene, env, size);
      placePage(page, scene, W, H, size, keep);
      const first = glyphs.length;
      const groups = [page.main, page.sub].filter(Boolean);
      groups.forEach(grp => {
        const groupId = grp === page.main ? 0 : 1;
        let vis = 0;
        grp.glyphs.forEach((g, seq) => {
          g.group = groupId;
          g.page = index;
          g.seq = seq;
          g.vis = g.blank ? -1 : vis++;
          g.parity = g.vis >= 0 ? g.vis % 2 : 0;
          g.seed = hash32(index + 1, groupId + 1, seq + 1) % 100000;
          g.r1 = rnd(g.seed, 1); g.r2 = rnd(g.seed, 2); g.r3 = rnd(g.seed, 3);
          g.index = glyphs.length;
          glyphs.push(g);
        });
        grp.count = vis;
        grp.lines.forEach(line => {
          line.idx = line.idx.map(i => i + (glyphs.length - grp.glyphs.length));
          const count = line.idx.filter(i => !glyphs[i].blank).length;
          line.idx.forEach(i => { glyphs[i].lineCount = count; });
        });
      });
      const b = page.box;
      glyphs.slice(first).forEach(g => {
        g.relX = b.x1 > b.x0 ? (g.cx - b.x0) / (b.x1 - b.x0) : 0.5;
        g.relY = b.y1 > b.y0 ? (g.cy - b.y0) / (b.y1 - b.y0) : 0.5;
        // 文字の描画原点（スプライト内の ox, oy に対応）からブロック左上までの距離
        g.bx = g.cx + g.ox - b.x0;
        g.by = g.cy + g.oy - b.y0;
      });
      return {
        index,
        first,
        last: glyphs.length,
        box: b,
        mainBox: page.main.box,
        subBox: page.sub ? page.sub.box : null,
        mainLines: page.main.lines,
        subLines: page.sub ? page.sub.lines : [],
        subSize: page.subSize,
        hasSub: Boolean(page.sub),
        mainMetrics: page.main.metrics,
        subMetrics: page.sub ? page.sub.metrics : null,
        visibleCount: glyphs.slice(first).filter(g => !g.blank).length
      };
    });
    return { W, H, vertical, fit, size, subSize: size * (scene.subSize || 0.35), pages, glyphs };
  }

  /* ================= タイムライン ================= */

  function orderRanks(count, order, seed) {
    const ranks = new Array(count);
    const c = (count - 1) / 2;
    if (order === 'reverse') for (let i = 0; i < count; i++) ranks[i] = count - 1 - i;
    else if (order === 'center') for (let i = 0; i < count; i++) ranks[i] = Math.floor(Math.abs(i - c) + 1e-9);
    else if (order === 'edges') {
      const maxLevel = Math.floor(c + 1e-9);
      for (let i = 0; i < count; i++) ranks[i] = maxLevel - Math.floor(Math.abs(i - c) + 1e-9);
    } else if (order === 'random') {
      const idx = Array.from({ length: count }, (_, i) => i);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(rnd(seed, i, 77) * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      idx.forEach((glyphIndex, rank) => { ranks[glyphIndex] = rank; });
    } else for (let i = 0; i < count; i++) ranks[i] = i;
    return ranks;
  }

  function buildTimeline(scene, layout) {
    const glyphs = layout.glyphs;
    const n = glyphs.length;
    const T = {
      inStart: new Float64Array(n).fill(Infinity),
      inDur: new Float64Array(n),
      outStart: new Float64Array(n).fill(Infinity),
      outDur: new Float64Array(n),
      inFx: new Array(n),
      outFx: new Array(n),
      // 「中央に1文字ずつ」で、その文字だけが中央に大きく出ている区間
      soloStart: new Float64Array(n).fill(Infinity),
      soloEnd: new Float64Array(n).fill(-Infinity),
      pages: [],
      duration: 0,
      posterTime: 0
    };
    const t0 = Math.max(0, scene.startDelay || 0);
    const deco = scene.deco || {};
    const decoAnimated = deco.type && deco.type !== 'none' && deco.anim !== 'none';
    const decoDur = decoAnimated ? Math.max(0.05, deco.dur || 0.4) : 0;
    const inDef = IN_MAP[scene.inFx] || IN_MAP.fade;
    // 「退場あり」がオフなら退場の種類に関係なく消さない
    const outDef = scene.outEnabled === false ? OUT_MAP.none : (OUT_MAP[scene.outFx] || OUT_MAP.fade);
    const inDur = Math.max(0, scene.inDur ?? inDef.dur);
    const outDur = Math.max(0, scene.outDur ?? outDef.dur);
    const hold = Math.max(0, scene.hold ?? 1);
    const bg = scene.bg || {};
    const bgDur = Math.max(0.3, decoDur || 0.4);
    const bgSynced = Boolean(bg.type && bg.type !== 'none' && bg.sync && (bg.opacity ?? 0.5) > 0);
    const solo = scene.mode === 'trailer' && scene.reveal === 'solo';
    let cursor = t0;

    layout.pages.forEach((page, pi) => {
      const isLast = pi === layout.pages.length - 1;
      const pg = { index: pi, blockIn: null, blockOut: null, decoIn: null, decoOut: null, scroll: null, cursor: null, solo: null, spread: null };
      const pageStart = cursor;
      // 帯・テープ・枠・ボックスが現れてから文字が出る
      const opensFirst = ['band', 'tape', 'frame', 'box'].includes(deco.type);
      let lead = decoAnimated && opensFirst ? Math.min(0.3, decoDur * 0.6) : 0;
      // EXの演出（雷・刀など）が先に走ってから文字が出る
      lead = Math.max(lead, sfxTiming(scene).lead);
      // 「中央に1文字ずつ」は、背景が現れきってから1文字目を出す
      if (solo && pi === 0 && bgSynced) lead = Math.max(lead, bgDur);
      const textStart = pageStart + lead;
      if (decoAnimated) pg.decoIn = { start: pageStart, dur: decoDur };
      const pageGlyphs = glyphs.slice(page.first, page.last);
      const mainG = pageGlyphs.filter(g => g.group === 0);
      const subG = pageGlyphs.filter(g => g.group === 1);
      let inEnd = textStart;

      if (scene.mode === 'trailer') {
        const fx = inDef.level === 'block' || inDef.noTrailer ? IN_MAP.fade : inDef;
        const gDur = fx.id === 'typewriter' ? 0 : Math.max(0, scene.glyphDur ?? 0.4);
        const reveal = scene.reveal || 'char';
        if (reveal === 'scroll') {
          const vertical = layout.vertical;
          const b = page.box;
          const speed = Math.max(5, scene.scrollSpeed || 80);
          const from = vertical ? -(b.x1) : layout.H - b.y0;
          const to = vertical ? layout.W - b.x0 : -b.y1;
          const dist = Math.abs(to - from);
          pg.scroll = { start: textStart, dur: dist / speed, from, to, vertical };
          pageGlyphs.forEach(g => { T.inStart[g.index] = textStart; T.inDur[g.index] = 0; T.inFx[g.index] = null; });
          inEnd = textStart + dist / speed;
        } else if (reveal === 'line' || reveal === 'sweep') {
          const interval = Math.max(0.05, scene.lineInterval ?? 0.8);
          const sweep = Math.max(0.05, scene.sweepDur ?? 1.2);
          let li = 0;
          page.mainLines.forEach(line => {
            if (!line.visible) return;
            const lineStart = textStart + li * interval;
            line.idx.forEach(i => {
              const g = glyphs[i];
              T.inStart[i] = reveal === 'sweep' ? lineStart + g.linePos * sweep : lineStart;
              T.inDur[i] = gDur;
              T.inFx[i] = fx;
              inEnd = Math.max(inEnd, T.inStart[i] + gDur);
            });
            li++;
          });
        } else if (reveal === 'all') {
          mainG.forEach(g => { T.inStart[g.index] = textStart; T.inDur[g.index] = gDur; T.inFx[g.index] = fx; });
          inEnd = textStart + gDur;
        } else if (reveal === 'spread') {
          // 各行の文字を中央に重ねて出し、少し見せてから左右（縦書きは上下）に広げて並べる
          const b = page.box;
          const stackHold = Math.max(0, scene.spreadHold ?? 0.5);
          const dur = Math.max(0.05, scene.spreadDur ?? 0.9);
          const start = textStart + SPREAD_APPEAR + stackHold;
          mainG.forEach(g => { T.inStart[g.index] = textStart; T.inDur[g.index] = 0; T.inFx[g.index] = null; });
          pg.spread = { appear: textStart, start, dur, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 };
          // 行ごとのばらけ具合（中央からいちばん遠い文字までの距離で決める）
          page.mainLines.forEach(line => {
            const list = line.idx.map(i => glyphs[i]).filter(g => !g.blank);
            const reach = Math.max(0, ...list.map(g => Math.abs(g.vertical ? g.cy - pg.spread.cy : g.cx - pg.spread.cx)));
            list.forEach(g => { g.spreadLoose = spreadLoose(reach, g.size); });
          });
          inEnd = start + dur;
        } else if (reveal === 'solo') {
          // 1文字ずつ画面の中央に大きく出してから、全文を一度に出す。空白と改行は1拍あける（続いても1拍）
          const beat = 1 / Math.max(1, scene.cps || 12);
          const pause = Math.max(0, scene.soloPause ?? 0.4);
          let k = 0;
          let gap = false;
          page.mainLines.forEach((line, li) => {
            if (li > 0) gap = true;
            line.idx.forEach(i => {
              if (glyphs[i].blank) { gap = true; return; }
              if (gap && k > 0) k++;
              gap = false;
              T.soloStart[i] = textStart + k * beat - TIME_EPS;
              T.soloEnd[i] = textStart + (k + 1) * beat - TIME_EPS;
              k++;
            });
          });
          // 最後の文字のあと、タメ（何も出ない間）をおいて全文
          const full = textStart + (k > 0 ? k * beat + pause : 0) - TIME_EPS;
          mainG.forEach(g => { T.inStart[g.index] = full; T.inDur[g.index] = 0; T.inFx[g.index] = null; });
          // 叩きつけで大きくなっても画像からはみ出さない倍率
          const b = page.box;
          const edge = layout.size * 0.05;
          const hw = Math.max(1, (b.x1 - b.x0) / 2), hh = Math.max(1, (b.y1 - b.y0) / 2);
          const bcx = (b.x0 + b.x1) / 2, bcy = (b.y0 + b.y1) / 2;
          const room = Math.min((Math.min(bcx, layout.W - bcx) - edge) / hw, (Math.min(bcy, layout.H - bcy) - edge) / hh);
          pg.solo = { start: textStart, full, room: Math.max(1, room) };
          inEnd = full + SOLO_PUNCH;
        } else {
          const cps = Math.max(1, scene.cps || 12);
          const punct = Math.max(0, scene.punctPause ?? 0.25);
          const linePause = Math.max(0, scene.linePause ?? 0.35);
          let t = textStart;
          page.mainLines.forEach(line => {
            line.idx.forEach(i => {
              const g = glyphs[i];
              T.inStart[i] = t;
              T.inDur[i] = gDur;
              T.inFx[i] = fx;
              inEnd = Math.max(inEnd, t + gDur);
              t += 1 / cps;
              if (PAUSE_LONG.has(g.ch)) t += punct;
              else if (PAUSE_SHORT.has(g.ch)) t += punct * 0.5;
            });
            t += linePause;
          });
          if (scene.cursor) pg.cursor = { start: textStart };
        }
      } else {
        const blockIn = inDef.level === 'block';
        if (blockIn) {
          pg.blockIn = { fx: inDef, start: textStart, dur: Math.max(0.05, inDur) };
          mainG.forEach(g => { T.inStart[g.index] = textStart; T.inDur[g.index] = 0; T.inFx[g.index] = null; });
          inEnd = textStart + Math.max(0.05, inDur);
        } else {
          const vis = mainG.filter(g => !g.blank);
          const ranks = orderRanks(vis.length, scene.inOrder, 17 + pi);
          const stagger = inDef.id === 'typewriter' ? Math.max(0.01, scene.inStagger || 0.08) : Math.max(0, scene.inStagger || 0);
          const dur = inDef.id === 'typewriter' ? 0 : inDur;
          // EXの炎：火が文字の下を通りすぎたところから、1文字ずつ立ち上がる
          const flame = sfxOf(scene).type === 'flame' ? flameSpan(mainBox(layout, page), layout.size) : null;
          if (flame) pg.flameSpan = flame;
          vis.forEach((g, i) => {
            T.inStart[g.index] = flame ? flameIgnite({ start: pageStart }, flame, g.cx) + FLAME_RISE_LAG : textStart + ranks[i] * stagger;
            T.inDur[g.index] = dur;
            T.inFx[g.index] = inDef;
            inEnd = Math.max(inEnd, T.inStart[g.index] + dur);
          });
        }
        if (subG.length) {
          const subFxId = scene.subFx || 'same';
          const subVis = subG.filter(g => !g.blank);
          if (subFxId === 'same' && blockIn) {
            subG.forEach(g => { T.inStart[g.index] = textStart; T.inDur[g.index] = 0; T.inFx[g.index] = null; });
          } else {
            const fx = subFxId === 'same' ? inDef : (IN_MAP[subFxId] && IN_MAP[subFxId].level === 'glyph' ? IN_MAP[subFxId] : IN_MAP.fade);
            const subStart = Math.max(textStart, inEnd + (scene.subDelay ?? -0.2));
            pg.subStart = subStart;
            const ranks = orderRanks(subVis.length, subFxId === 'same' ? scene.inOrder : 'forward', 31 + pi);
            const baseStagger = subFxId === 'same' ? Math.min(scene.inStagger || 0, 0.05) : 0.035;
            const stagger = fx.id === 'typewriter' ? 0.05 : (subFxId === 'fade' ? 0 : baseStagger);
            const dur = fx.id === 'typewriter' ? 0 : (subFxId === 'same' ? inDur : fx.dur);
            let subEnd = subStart;
            subVis.forEach((g, i) => {
              T.inStart[g.index] = subStart + ranks[i] * stagger;
              T.inDur[g.index] = dur;
              T.inFx[g.index] = fx;
              subEnd = Math.max(subEnd, T.inStart[g.index] + dur);
            });
            inEnd = Math.max(inEnd, subEnd);
          }
        }
      }
      // 空白（描画しない文字）は直前の文字と同時に扱う
      pageGlyphs.forEach(g => {
        if (!Number.isFinite(T.inStart[g.index])) { T.inStart[g.index] = textStart; T.inDur[g.index] = 0; }
      });

      // スクロールは流れ終わった時点で終了（表示時間は使わない）
      const holdEnd = pg.scroll ? inEnd : inEnd + hold;
      let outEnd = Infinity;
      const noOut = outDef.level === 'none';
      if (pg.scroll) {
        outEnd = inEnd;
        pageGlyphs.forEach(g => { T.outStart[g.index] = inEnd; T.outDur[g.index] = 0; });
      } else if (noOut && isLast) {
        outEnd = Infinity;
      } else if (noOut) {
        outEnd = holdEnd;
        pageGlyphs.forEach(g => { T.outStart[g.index] = holdEnd; T.outDur[g.index] = 0; });
      } else if (outDef.level === 'block') {
        const dur = Math.max(0.05, outDur);
        pg.blockOut = { fx: outDef, start: holdEnd, dur };
        outEnd = holdEnd + dur;
        pageGlyphs.forEach(g => { T.outStart[g.index] = outEnd; T.outDur[g.index] = 0; });
      } else {
        const dur = outDef.id === 'erase' ? 0 : outDur;
        const groups = [mainG, subG];
        outEnd = holdEnd;
        groups.forEach((list, gi) => {
          const vis = list.filter(g => !g.blank);
          const order = outDef.id === 'erase' && scene.outOrder === 'forward' ? 'reverse' : scene.outOrder;
          const ranks = orderRanks(vis.length, order, 53 + pi * 3 + gi);
          const stagger = outDef.id === 'erase' ? Math.max(0.01, scene.outStagger || 0.06) : Math.max(0, scene.outStagger || 0);
          vis.forEach((g, i) => {
            T.outStart[g.index] = holdEnd + ranks[i] * stagger;
            T.outDur[g.index] = dur;
            T.outFx[g.index] = outDef;
            outEnd = Math.max(outEnd, T.outStart[g.index] + dur);
          });
          list.filter(g => g.blank).forEach(g => { T.outStart[g.index] = holdEnd; T.outDur[g.index] = 0; });
        });
      }

      let end = outEnd;
      if (Number.isFinite(outEnd)) end = Math.max(end, outEnd + sfxTiming(scene).tail);
      if (Number.isFinite(outEnd)) {
        if (decoAnimated) {
          const start = holdEnd + Math.max(0, outEnd - holdEnd) * 0.35;
          pg.decoOut = { start, dur: decoDur };
          end = Math.max(end, start + decoDur);
        } else {
          pg.decoOut = { start: outEnd, dur: 0 };
        }
      }
      Object.assign(pg, { start: pageStart, textStart, inEnd, holdEnd, outEnd, end });
      if (pg.scroll) {
        pg.poster = pg.scroll.start + pg.scroll.dur * 0.5;
      } else {
        pg.poster = inEnd;
      }
      T.pages.push(pg);
      cursor = Number.isFinite(end) ? end + (scene.mode === 'trailer' ? Math.max(0, scene.pageGap ?? 0.3) : 0) : pageStart + (inEnd - pageStart) + hold;
      if (!Number.isFinite(end)) T.lastVisibleForever = true;
    });

    const lastPage = T.pages[T.pages.length - 1];
    const contentEnd = lastPage ? (Number.isFinite(lastPage.end) ? lastPage.end : lastPage.holdEnd) : t0;
    T.duration = Math.max(0.2, contentEnd + Math.max(0, scene.endDelay || 0));
    T.posterTime = T.pages.length ? Math.min(T.duration, T.pages[0].poster) : 0;
    T.bgIn = { start: t0, dur: bgDur };
    T.bgOut = lastPage && Number.isFinite(lastPage.end) ? { start: Math.max(t0, lastPage.end - bgDur), dur: bgDur } : null;
    // 各フェーズの区間（タイムライン表示用）
    // 退場しない最後のページは、終了まで「表示」として扱う
    T.segments = T.pages.map(pg => (Number.isFinite(pg.end)
      ? { start: pg.start, inEnd: pg.inEnd, holdEnd: pg.holdEnd, end: pg.end }
      : { start: pg.start, inEnd: pg.inEnd, holdEnd: T.duration, end: T.duration }));
    return T;
  }

  /* ================= スプライト（文字画像キャッシュ） ================= */

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // テープの点滅：0.5秒周期で、明るい状態から短く暗くなる（1で最も暗い）。phase は周期に対するずれ
  function tapeBlinkWave(t, phase) {
    const p = (((t / 0.5) + phase) % 1 + 1) % 1;
    const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
    return smooth(0.55, 0.62, p) * (1 - smooth(0.9, 0.97, p));
  }

  function colorWithAlpha(hex, alpha) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return hex;
    const v = parseInt(m[1], 16);
    return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${clamp(alpha)})`;
  }

  function groupStyle(scene, group, size) {
    const k = size / Math.max(1, scene.fontSize || size);
    const st = {
      fill: scene.fill || { type: 'solid', color: '#ffffff' },
      fillOpacity: clamp(scene.fillOpacity ?? 1),
      stroke1: scene.stroke && scene.stroke.on && scene.stroke.width > 0 ? { w: Math.max(0.5, scene.stroke.width * k), color: scene.stroke.color } : null,
      stroke2: scene.stroke2 && scene.stroke2.on && scene.stroke2.width > 0 ? { w: Math.max(0.5, scene.stroke2.width * k), color: scene.stroke2.color } : null,
      shadow: scene.shadow && scene.shadow.on ? {
        color: colorWithAlpha(scene.shadow.color, scene.shadow.opacity ?? 0.6),
        blur: Math.max(0, (scene.shadow.blur || 0) * k),
        x: (scene.shadow.x || 0) * k,
        y: (scene.shadow.y || 0) * k
      } : null,
      glow: scene.glow && scene.glow.on ? {
        color: scene.glow.color,
        blur: Math.max(1, (scene.glow.size || 0) * k),
        strength: clamp(scene.glow.strength ?? 1, 0.1, 4)
      } : null
    };
    if (group === 1 && scene.subColorOn) st.fill = { type: 'solid', color: scene.subColor || '#ffffff' };
    return st;
  }

  const SHADOW_OFFSET = 20000;

  function buildGlyphSprite(g, font, style, gradient) {
    const measureCanvas = buildGlyphSprite.mc || (buildGlyphSprite.mc = makeCanvas(8, 8));
    const mctx = measureCanvas.getContext('2d');
    mctx.font = font;
    mctx.textAlign = g.vertical ? 'center' : 'left';
    mctx.textBaseline = g.vertical ? 'middle' : 'alphabetic';
    const m = mctx.measureText(g.ch);
    const size = g.size;
    let l = -(Number.isFinite(m.actualBoundingBoxLeft) ? m.actualBoundingBoxLeft : (g.vertical ? size / 2 : 0));
    let r = Number.isFinite(m.actualBoundingBoxRight) ? m.actualBoundingBoxRight : (g.vertical ? size / 2 : m.width);
    let t = -(Number.isFinite(m.actualBoundingBoxAscent) ? m.actualBoundingBoxAscent : (g.vertical ? size / 2 : size * 0.85));
    let b = Number.isFinite(m.actualBoundingBoxDescent) ? m.actualBoundingBoxDescent : (g.vertical ? size / 2 : size * 0.2);
    if (g.rot) { const nl = -b, nr = -t, nt = l, nb = r; l = nl; r = nr; t = nt; b = nb; }
    const t1 = style.stroke1 ? style.stroke1.w : 0;
    const t2 = style.stroke2 ? style.stroke2.w : 0;
    const outline = t1 + t2;
    let pad = outline + 3;
    if (style.glow) pad = Math.max(pad, outline + style.glow.blur * 1.25 + 4);
    if (style.shadow) pad = Math.max(pad, outline + style.shadow.blur * 1.25 + Math.max(Math.abs(style.shadow.x), Math.abs(style.shadow.y)) + 4);
    pad = Math.ceil(pad);
    const w = Math.min(4096, Math.ceil(r - l + pad * 2));
    const h = Math.min(4096, Math.ceil(b - t + pad * 2));
    const ox = pad - l;
    const oy = pad - t;

    const place = (c, shiftX = 0, shiftY = 0) => {
      c.setTransform(1, 0, 0, 1, ox + shiftX, oy + shiftY);
      if (g.rot) c.rotate(Math.PI / 2);
      c.font = font;
      c.textAlign = g.vertical ? 'center' : 'left';
      c.textBaseline = g.vertical ? 'middle' : 'alphabetic';
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.miterLimit = 2;
    };
    const silhouette = (c, strokeW) => {
      c.fillText(g.ch, 0, 0);
      if (strokeW > 0) { c.lineWidth = strokeW * 2; c.strokeText(g.ch, 0, 0); }
    };

    // ink: 文字の形そのものの範囲（スプライト内の座標）
    const sprite = { ox, oy, w, h, glow: null, back: null, front: null, ink: { x0: ox + l, y0: oy + t, x1: ox + r, y1: oy + b } };

    if (style.glow) {
      const c = makeCanvas(w, h).getContext('2d');
      const passes = Math.ceil(style.glow.strength);
      for (let i = 0; i < passes; i++) {
        c.save();
        place(c, -SHADOW_OFFSET, 0);
        c.shadowColor = style.glow.color;
        c.shadowBlur = style.glow.blur;
        c.shadowOffsetX = SHADOW_OFFSET;
        c.globalAlpha = i === passes - 1 ? (style.glow.strength - (passes - 1)) : 1;
        c.fillStyle = '#000';
        c.strokeStyle = '#000';
        silhouette(c, outline);
        c.restore();
      }
      c.save();
      place(c);
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = '#000';
      c.strokeStyle = '#000';
      silhouette(c, outline);
      c.restore();
      sprite.glow = c.canvas;
    }

    if (style.shadow || style.stroke2) {
      const c = makeCanvas(w, h).getContext('2d');
      if (style.shadow) {
        c.save();
        place(c, -SHADOW_OFFSET, 0);
        c.shadowColor = style.shadow.color;
        c.shadowBlur = style.shadow.blur;
        c.shadowOffsetX = SHADOW_OFFSET + style.shadow.x;
        c.shadowOffsetY = style.shadow.y;
        c.fillStyle = '#000';
        c.strokeStyle = '#000';
        silhouette(c, outline);
        c.restore();
      }
      if (style.stroke2) {
        c.save();
        place(c);
        c.strokeStyle = style.stroke2.color;
        c.lineWidth = outline * 2;
        c.strokeText(g.ch, 0, 0);
        c.restore();
      }
      c.save();
      place(c);
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = '#000';
      c.strokeStyle = '#000';
      silhouette(c, t1);
      c.restore();
      sprite.back = c.canvas;
    }

    const c = makeCanvas(w, h).getContext('2d');
    if (style.stroke1) {
      c.save();
      place(c);
      c.strokeStyle = style.stroke1.color;
      c.lineWidth = t1 * 2;
      c.strokeText(g.ch, 0, 0);
      if (style.fillOpacity < 1) {
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = '#000';
        c.fillText(g.ch, 0, 0);
      }
      c.restore();
    }
    c.save();
    place(c);
    c.globalAlpha = style.fillOpacity;
    c.fillStyle = makeFillStyle(c, style.fill, g, gradient, ox, oy);
    c.fillText(g.ch, 0, 0);
    c.restore();
    sprite.front = c.canvas;
    return sprite;
  }

  // グラデーションはスプライトのピクセル座標で指定し、回転文字用に逆変換してから渡す
  function makeFillStyle(c, fill, g, gradient, ox, oy) {
    if (!fill || fill.type !== 'gradient') return (fill && fill.color) || '#ffffff';
    const colors = [fill.color, fill.color2, fill.color3].filter(Boolean);
    if (colors.length < 2) return colors[0] || '#ffffff';
    let x0, y0, x1, y1;
    if (fill.dir === 'h' || fill.dir === 'd') {
      const bw = gradient.w, bh = gradient.h;
      const left = ox - g.bx, top = oy - g.by;
      if (fill.dir === 'h') { x0 = left; y0 = 0; x1 = left + bw; y1 = 0; }
      else { x0 = left; y0 = top; x1 = left + bw; y1 = top + bh; }
    } else if (g.vertical) {
      x0 = 0; x1 = 0; y0 = oy - g.size * 0.5; y1 = oy + g.size * 0.5;
    } else {
      x0 = 0; x1 = 0; y0 = oy - gradient.inkA; y1 = oy + gradient.inkD;
    }
    const toLocal = (X, Y) => {
      const dx = X - ox, dy = Y - oy;
      return g.rot ? [dy, -dx] : [dx, dy];
    };
    const [a0, b0] = toLocal(x0, y0);
    const [a1, b1] = toLocal(x1, y1);
    const grad = c.createLinearGradient(a0, b0, a1 === a0 && b1 === b0 ? a1 + 0.01 : a1, b1);
    colors.forEach((color, i) => grad.addColorStop(i / (colors.length - 1), color));
    return grad;
  }

  /* ================= 描画 ================= */

  const FILTER_SUPPORTED = (() => {
    try {
      const c = document.createElement('canvas').getContext('2d');
      c.filter = 'blur(2px)';
      return c.filter === 'blur(2px)';
    } catch (error) {
      return false;
    }
  })();

  function fontFamiliesFor(scene, group, resolveFont) {
    return resolveFont(group === 1 && scene.subFontId && scene.subFontId !== 'same' ? scene.subFontId : scene.fontId);
  }

  /* ================= EXの演出（雷・サイバー警告・刀の斬撃） ================= */
  // scene.sfx = { type, color, color2, power, word }。文字とは別に、画像の上に描く演出。
  // lead：演出が先に走ってから文字が出るまでの時間 / tail：文字が消えたあとも演出が残る時間
  const SFX_TIMING = {
    none: { lead: 0, tail: 0 },
    lightning: { lead: 0.6, tail: 0 },
    cyber: { lead: 1.05, tail: 0.3 },
    katana: { lead: 0, tail: 0 },
    frame: { lead: 0.45, tail: 0 },
    crest: { lead: 0.88, tail: 0 },
    gunshot: { lead: 0.9, tail: 0 },
    flame: { lead: 0.15, tail: 0 },
    p5round: { lead: 0.35, tail: 0.25 },
    p5round2: { lead: 0.3, tail: 0.3 },
    p5gun: { lead: 0.7, tail: 0 },
    // 判定カットイン：lead は結果の段階ごとに変わる（sfxTiming）
    blade: { lead: 0.42, tail: 0.2 },
    shot: { lead: 0.56, tail: 0.2 },
    star: { lead: 0.45, tail: 0.2 },
    dream: { lead: 0.5, tail: 0.2 },
    vampire: { lead: 0.5, tail: 0.2 },
    // 牙の戦闘開始：牙が上下から迫って噛み合う時刻（FANG_CLAP）に文字が叩きつけられる
    fang: { lead: 0.58, tail: 0 },
    // 牙の戦闘演出：文字・帯のない、噛みつく牙だけの演出（画面の中央で噛む。戦闘シーンに重ねる用）
    fangFx: { lead: 0, tail: 0 },
    // 爪痕：文字のない、4本の爪痕が右上から左下へ引っかかれる演出（戦闘演出）
    clawMark: { lead: 0, tail: 0 },
    // 抜刀の一閃：文字のない、斜めの一閃と閃光だけの演出（戦闘演出）
    katanaFx: { lead: 0, tail: 0 },
    zangekiHard: { lead: 0, tail: 0 },
    // 弾痕：文字のない、1つの弾痕（黒い穴・白い縁・細いひび）だけの演出（戦闘演出）
    bulletMark: { lead: 0, tail: 0 },
    // 炎の試作（js/fx-fire.js）：炎の壁（画面の下でずっと燃える）/ 走る炎（左から燃え広がって消える）/ 火炎ブレス（地面を走って右端で爆発）/
    // 燃える文字（文字の画そのものが燃える）/ 燃える文字・演出（ブレス → 爆発 → 右から燃え移る → 左から火の粉になって消える）
    fireWall: { lead: 0, tail: 0 },
    fireRun: { lead: 0.7, tail: 1.15 },
    fireBreath: { lead: 0.62, tail: 0.7 },
    fireText: { lead: 0, tail: 0.35 },
    fireTextSeq: { lead: 0.22, tail: 0.8 }
  };
  // 文字の後ろに描く演出（装飾枠・剣と盾・銃撃・サイバー・赤と黒の2種）。ほかは文字の上に描く
  const SFX_BACK = new Set(['frame', 'crest', 'gunshot', 'cyber', 'p5round', 'p5round2', 'p5gun', 'fireRun', 'fireBreath']);
  // 文字の画そのものを炎で描く演出（メインの文字は普通には描かない。サブの文字はそのまま）
  const SFX_FIRE_TEXT = new Set(['fireText', 'fireTextSeq']);
  // 炎の色の基準（この色のとき試作どおりの橙。演出の色の色相との差だけ炎の色相を回す）
  const FIRE_BASE = '#ff7a2a';
  // 炎の壁の一周（秒）。書き出しの長さを整数個に割って、ループの継ぎ目が出ないようにする
  const FIRE_WALL_LOOP = 2.5;
  // 環境の演出（scene.env）。どのテンプレート・演出とも重ねられる。灰は試作どおり6秒で一周を目安に、書き出しの長さを整数個に割る
  const ENV_TYPES = new Set(['ash', 'ashBlack', 'smoke']);
  const ASH_LOOP = 6;
  const SMOKE_LOOP = 6;
  // 文字の後ろと手前の両方に描く演出（後ろに帯、手前に炎・一閃・閃光）
  const SFX_BOTH = new Set(['flame', 'blade', 'shot', 'star', 'dream', 'vampire', 'fang', 'fangFx']);
  // 牙の戦闘開始：牙が噛み合う時刻（場面の始めから）
  const FANG_CLAP = 0.56;
  // 装飾枠：線が角から辺の中央まで伸びる時間
  const FRAME_DRAW = 0.55;
  // 剣と盾：剣が飛び込んで止まるまで / 盾の輪郭を引く時間 / 帯が左右に開き始める時刻と開く時間
  const CREST_SWORDS = 0.3;
  const CREST_SHIELD = 0.34;
  const CREST_BAND_AT = 0.62;
  const CREST_BAND = 0.4;
  // 剣と盾：盾の先端（または柄頭）と帯の間のすき間（文字の大きさが単位）/ 剣の長さに対する、交点から柄頭の下端までの高さ
  const CREST_GAP = 0.12;
  const CREST_POMMEL = 0.307;
  // 銃撃：四隅の照準が定まるまで / 曳光弾が画面の外から届くまで / 赤い帯が走り込む時刻 /
  // 着弾の時刻と位置（x はメインの文字の幅の半分、ox と y は文字の大きさが単位。dx, dy は弾の飛ぶ向き）
  const GUN_LOCK = 0.32;
  const GUN_TRACER = 0.07;
  const GUN_BAND = 0.78;
  const GUN_SHOTS = [
    { t: 0.42, x: -0.62, y: -1.0, dx: 1, dy: 0.22 },
    { t: 0.54, x: 1, ox: 0.12, y: 1.0, dx: -1, dy: -0.18 },
    { t: 0.66, x: 0.28, y: -1.06, dx: -0.5, dy: 1 }
  ];
  // 炎：火が走る範囲の左右の余裕（文字の大きさが単位）/ 左端から右端まで走る時間 / 文字が燃えたあとから立ち上がるまでの遅れ /
  // 「燃えて消える」の燃え際のぼかし幅
  const FLAME_PAD = 1.7;
  const FLAME_RUN = 0.8;
  const FLAME_RISE_LAG = 0.06;
  const BURN_SOFT = 0.6;
  // 「光の粒になって消える」：文字がほどけ終わるまでの割合 / ほどけ際のぼかし幅（文字の大きさが単位）/ 1文字あたりの光の粒の数
  const FIREFLY_SWEEP = 0.5;
  const FIREFLY_SOFT = 1.2;
  const FIREFLY_PER_GLYPH = 14;
  // 「星屑になって消える」：粒が生まれ終わるまでの割合
  const STARDUST_SWEEP = 0.55;
  // 「星屑になって消える」で粒1つが文字を消す丸の半径 / 星の判定のブラックホールの芯の半径（文字の大きさが単位）
  const STARDUST_HOLE = 0.055;
  const ASHTEXT_SWEEP = 0.42;       // 灰になって消える：前線が文字を渡る時間の割合（残りはかけらが風に流れて消える）
  const ASHTEXT_BAND = 0.5;         // 崩れる直前に焦げて灰の色になっていく秒数
  const ASHTEXT_SLANT = 0.35;       // 前線の傾き（左下が先）
  const ASHTEXT_COLORS = { grey: [178, 166, 148], black: [16, 14, 12] };
  const vnoise2 = (x, y, seed) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = rnd(ix, iy, seed), b = rnd(ix + 1, iy, seed), c = rnd(ix, iy + 1, seed), d = rnd(ix + 1, iy + 1, seed);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const fbm2 = (x, y, seed) => (vnoise2(x, y, seed) + 0.5 * vnoise2(x * 2.1, y * 2.1, seed + 1) + 0.25 * vnoise2(x * 4.3, y * 4.3, seed + 2)) / 1.75;
  const ashShapes = {};
  function ashShape(j) {
    if (ashShapes[j]) return ashShapes[j];
    const nv = 7 + Math.floor(rnd(j, 1, 61) * 6), stretch = 1 + 0.7 * rnd(j, 2, 61), pts = [];
    for (let k = 0; k < nv; k++) {
      const a = (k + 0.35 * (rnd(j, 10 + k, 61) - 0.5)) / nv * TAU;
      let r = 0.55 + 0.45 * rnd(j, 30 + k, 61);
      if (rnd(j, 50 + k, 61) < 0.22) r *= 0.5;
      pts.push(Math.cos(a) * r * stretch, Math.sin(a) * r);
    }
    return (ashShapes[j] = pts);
  }
  const STAR_HOLE_R = 0.9;
  // 星の判定のまたたきを変える回数（1秒あたり）
  const STAR_TWINKLE_FPS = 8;
  // 決定的成功の光の筋が消えるまで
  const STAR_RAYS = 0.6;
  // 「炎に包まれて燃え尽きる」：燃え移り終わるまでの割合 / 炎の色（奥の赤 → 赤 → 橙 → 黄 → 芯の白）
  const BLAZE_SWEEP = 0.6;
  const BLAZE = { deep: '#8f1404', red: '#e0400c', orange: '#ff8a1e', yellow: '#ffd25a', white: '#fff4d6' };
  const FLAME_BAND = '#120c0a';
  const SFX_TYPES = Object.keys(SFX_TIMING);
  // 雷：左右から走る電気が中央で出会うまで / 中央の火花が散りきるまで / 退場前の落雷
  const ARC_RUN = 0.42;
  const SPARK_DUR = 0.75;
  const SPARK_COUNT = 36;
  const STRIKE_DUR = 0.42;
  // 刀：一閃が横切る時間 / 一閃の光が消えるまで / 切れた瞬間の切り口の光 / 切れた瞬間の揺れ
  const SLASH_SWEEP = 0.14;
  const SLASH_DUR = 0.5;
  const CUT_GLINT = 0.4;
  const CUT_IMPACT = 0.3;
  // サイバー：警告マークが点滅して線につぶれるまで / 表示中のノイズの間隔
  const CYBER_ALERT = 0.9;
  const CYBER_BURST = 1.4;

  // 赤と黒の演出（ラウンド表示・戦闘開始と銃撃）で共通の、文字の傾き（ラジアン。右上がり）
  const P5_TILT = -0.12;
  // ラウンド表示：文字が奥から手前へ飛んでくる時間 / 消失点の位置（文字の中心から。文字の大きさが単位）
  const P5_ZOOM = 0.5;
  const P5_VP = { x: 2.2, y: -1.1 };
  // 戦闘開始と銃撃：着弾の時刻と位置（x はメインの文字の幅の半分、y は文字の大きさが単位）/ 黒い帯が走り込む時刻
  const P5_SHOTS = [
    { t: 0.1, x: -0.95, y: -0.55 },
    { t: 0.26, x: 1.02, y: 0.5 },
    { t: 0.42, x: 0.2, y: -0.8 }
  ];
  const P5_BAND = 0.56;

  // ラウンド表示の文字の動き：消失点の近くで小さく → 手前へ飛んできて少し行きすぎて止まる → 表示中はわずかに迫る →
  // 退場で画面の手前へ抜けていく
  function p5RoundState(pg, t, size) {
    const z = clamp((t - pg.textStart) / P5_ZOOM);
    const e = EASE.outExpo(z);
    let s = Math.max(0.03, EASE.outBack(z));
    const hold = Number.isFinite(pg.holdEnd) ? clamp((t - pg.inEnd) / Math.max(0.1, pg.holdEnd - pg.inEnd)) : 0;
    s *= 1 + 0.04 * hold;
    const q = outProgress(pg, t);
    s *= 1 + 1.4 * q * q;
    return {
      s,
      x: P5_VP.x * size * (1 - e),
      y: P5_VP.y * size * (1 - e),
      r: P5_TILT + (1 - e) * 0.5,
      shown: t >= pg.textStart,
      z,
      q
    };
  }

  // 戦闘開始と銃撃の文字の動き：着弾のたびに揺れ、退場で左へ一気に抜ける
  function p5GunState(pg, t, size, width) {
    let x = 0, y = 0;
    const d = t - pg.start;
    P5_SHOTS.forEach((sh, i) => {
      const u = d - sh.t;
      if (u < 0 || u > 0.22) return;
      const decay = Math.pow(1 - u / 0.22, 2);
      x += noise1(t * 60, 11 + i) * size * 0.08 * decay;
      y += noise1(t * 60, 29 + i) * size * 0.06 * decay;
    });
    const u = d - P5_BAND - 0.12;
    if (u >= 0 && u < 0.2) y += Math.sin(u / 0.2 * Math.PI) * size * 0.05 * (1 - u / 0.2);
    const q = EASE.inCubic(outProgress(pg, t));
    x -= width * 1.3 * q;
    return { x, y, r: P5_TILT * 0.6, q };
  }

  // ギザギザの星（衝撃の形）：n 本のとがりを持つ多角形。とがりの長さは seed で少しずつ変える
  function p5Star(ctx, x, y, r, n, seed, rot) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + i / (n * 2) * TAU;
      const rr = i % 2 ? r * (0.42 + 0.12 * rnd(seed, i, 3)) : r * (0.8 + 0.35 * rnd(seed, i, 5));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  // 平行四辺形（横に傾けた札・帯）。中心 (x, y)、幅 w、高さ h、上辺を右へ skew だけずらす
  function p5Slab(ctx, x, y, w, h, skew) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + skew / 2, y - h / 2);
    ctx.lineTo(x + w / 2 + skew / 2, y - h / 2);
    ctx.lineTo(x + w / 2 - skew / 2, y + h / 2);
    ctx.lineTo(x - w / 2 - skew / 2, y + h / 2);
    ctx.closePath();
  }

  // ラウンド表示 Ver2：消失点（文字の中心から。文字の大きさが単位）/ 文字が飛んでくる時間 / 2本の線が伸びきるまで
  const P5_VP2 = { x: 3.4, y: -1.4 };
  const P5_ZOOM2 = 0.42;
  const P5_RAIL = 0.34;

  // ラウンド表示 Ver2 の文字の動き：消失点から2本の線の間を通って手前へ飛んできて止まり、退場でさらに手前へ抜ける。
  // 傾きは2本の線の向きにそろえる
  function p5Round2State(pg, t, size) {
    const z = clamp((t - pg.textStart) / P5_ZOOM2);
    const e = EASE.outExpo(z);
    const q = outProgress(pg, t);
    const qq = EASE.inQuad(q);
    // 消失点を中心に拡大・移動する（飛んでくる間も退場で手前へ抜ける間も、文字が2本の線の間に収まる）
    const s = Math.max(0.05, lerp(0.08, 1, e)) * (1 + 1.6 * qq);
    return {
      s,
      x: P5_VP2.x * size * (1 - s),
      y: P5_VP2.y * size * (1 - s),
      r: Math.atan2(P5_VP2.y, P5_VP2.x),
      shown: t >= pg.textStart,
      z,
      q
    };
  }

  // 戦闘開始と銃撃：1文字ずつの札の傾き（文字にも少し同じ傾きをつける）
  function p5CardTilt(index) {
    return (rnd(index, 3, 57) - 0.5) * 0.36;
  }

  function sfxGlyphTilt(scene, g) {
    return sfxOf(scene).type === 'p5gun' && g.group === 0 ? p5CardTilt(g.index) * 0.55 : 0;
  }

  // ラウンド表示 Ver2：文字も2本の線と同じ遠近にする（消失点に近いほど小さく、手前ほど大きく）。
  // 線の幅は消失点からの距離に比例して縮むので、文字の各位置を「その位置の線の幅」と同じ割合 λ で縮め、
  // 横方向もその割合で詰める。文字の上下が線の内側にぴったり接する
  function p5Round2Map(x, dist) {
    const lam = Math.exp(-x / dist);
    return { x: dist * (1 - lam), lam };
  }

  /* ---------- 判定カットイン（抜刀・銃撃） ---------- */
  // 結果の段階：成功 / スペシャル / 決定的成功（クリティカル）/ 失敗 / 致命的失敗（ファンブル）
  // 判定の段階。special はCoC6のスペシャルとCoC7のハード成功、extreme はCoC7のイクストリーム成功（極成功）
  const ROLL_TIERS = ['success', 'special', 'extreme', 'critical', 'failure', 'fumble'];
  // 抜刀：一閃が画面を横切る時間 / 一閃の跡が消えるまで / 円月（決定的成功で文字を囲む刃の軌跡）を描く時間
  const BLADE_SWEEP = 0.12;
  const BLADE_FADE = 0.45;
  const BLADE_RING = 0.3;
  // 抜刀の段取り。lead：文字が出る（決めの）時刻 / ring：円月を描き始める時刻 / cuts：一閃
  // （t：振り始め / ang：傾き。負は右上がり / rev：右から左へ / off：文字の中心からのずれ（文字の大きさが単位）/
  //   snap：刃が折れる位置 0〜1 / miss：文字の右上の角をかすめて外れる。帯の中だけに描き、跡が帯に残る / pre：予兆の線がのび始める時刻 /
  //   sweep：振り抜く時間）
  // 失敗は先に帯と文字を出し、そのあとで振って外す
  const BLADE_PLAN = {
    success: { lead: 0.42, cuts: [{ t: 0.28, ang: -0.3 }] },
    special: { lead: 0.6, cuts: [{ t: 0.28, ang: -0.3 }, { t: 0.44, ang: 0.3, rev: true }] },
    extreme: { lead: 0.64, cuts: [{ t: 0.24, ang: -0.3 }, { t: 0.36, ang: 0.3, rev: true }, { t: 0.48, ang: -0.04 }] },
    critical: { lead: 0.84, ring: 0.51, cuts: [{ t: 0.19, ang: -0.3 }, { t: 0.27, ang: 0.3, rev: true }, { t: 0.36, ang: -0.04 }] },
    failure: { lead: 0.12, cuts: [{ t: 0.72, pre: 0.38, ang: 1.25, miss: true, sweep: 0.16 }] },
    fumble: { lead: 0.28, cuts: [{ t: 0.2, ang: -0.3, snap: 0.5 }] }
  };
  // 銃撃：曳光弾が画面の外から着弾点まで飛ぶ時間
  const SHOT_TRACER = 0.07;
  // 銃撃の段取り。lead：文字が出る（決めの）時刻 / lock：照準が定まる時刻 / shots：着弾の時刻 /
  // miss：弾が文字の右の帯に逸れて穴が残る / aim：照準が逸れ始める時刻 / jam：弾が詰まって照準が砕ける時刻
  // 失敗は先に帯と文字を出し、そのあとで撃って外す
  const SHOT_PLAN = {
    success: { lead: 0.46, lock: 0.26, shots: [0.46] },
    special: { lead: 0.6, lock: 0.26, shots: [0.44, 0.6] },
    extreme: { lead: 0.74, lock: 0.3, shots: [0.5, 0.6, 0.74] },
    critical: { lead: 0.96, lock: 0.42, shots: [0.62, 0.7, 0.78, 0.96] },
    failure: { lead: 0.12, aim: 0.5, shots: [0.78], miss: true },
    fumble: { lead: 0.66, jam: 0.42 }
  };
  // 決めの一発より前の着弾点（文字の中心から。文字の大きさが単位）
  const SHOT_SPOTS = [[0.16, -0.12], [-0.14, 0.1], [0.04, 0.16]];
  // 星（夢と星空）の段取り。lead：文字が出る（決めの）時刻。流れ星はこの時刻に文字の中心の近くを通る /
  // meteors：ほかの流れ星（tp：通る時刻 / off：通り道のずれ。文字の大きさが単位 / w：太さの倍率）/
  // burst：決めの瞬間に散るきらめきの数 / glints：表示中に文字のまわりで瞬くきらめきの数 /
  // stars：星座（at：つなぎ始める時刻 / dur：つなぎ終わるまで / n：星の数 / closed：文字を一周する）/
  // shower：流星群の数（決定的成功）/ fizzle：失敗の流れ星が失速する時刻 / tail：退場のあと演出が残る時間
  const STAR_PLAN = {
    success: { lead: 0.45, meteors: [], burst: 10, glints: 4 },
    special: { lead: 0.55, meteors: [{ tp: 0.35, off: -1.3, w: 0.7 }, { tp: 0.46, off: 1.2, w: 0.6 }], burst: 16, glints: 6 },
    extreme: { lead: 0.64, meteors: [{ tp: 0.3, off: -1.5, w: 0.6 }, { tp: 0.4, off: 1.4, w: 0.7 }, { tp: 0.5, off: -0.7, w: 0.55 }], burst: 22, glints: 7,
      stars: { at: 0.52, dur: 0.6, n: 7, closed: false } },
    critical: { lead: 0.75, meteors: [], shower: 12, showerSpan: 0.55, burst: 30, glints: 10, stars: { at: 0.68, dur: 0.6, n: 10, closed: true } },
    failure: { lead: 0.12, fizzle: 0.75, glints: 0 },
    fumble: { lead: 0.6, tail: 0.35, glints: 0 }
  };
  // 夢（魔法と夢）の段取り。lead：文字が出る（光る星が文字の真ん中を通る）時刻 /
  // sweep：左から右へ流れる光る星の数（先頭の1つは大きい）/ mist：雲とミストのリボンの数 / fly：蝶の数 /
  // rainbow：虹の五線（arc：1本 / double：二本の重ね）/ burst：決めの瞬間に散るきらめき / glints：表示中のきらめき / tail：退場のあと演出が残る時間
  const DREAM_PLAN = {
    success: { lead: 0.5, sweep: 6, mist: 1, fly: 0, rainbow: null, burst: 12, glints: 5 },
    special: { lead: 0.55, sweep: 9, mist: 2, fly: 2, rainbow: null, burst: 16, glints: 7 },
    extreme: { lead: 0.62, sweep: 9, mist: 2, fly: 4, rainbow: 'arc', burst: 22, glints: 8 },
    critical: { lead: 0.72, sweep: 9, mist: 3, fly: 5, rainbow: 'double', burst: 20, glints: 7 },
    failure: { lead: 0.3, sweep: 3, mist: 2, fly: 1, rainbow: null, burst: 0, glints: 0 },
    fumble: { lead: 0.55, tail: 0.35, sweep: 2, mist: 3, fly: 0, rainbow: null, burst: 0, glints: 0 }
  };
  // ヴァンパイアの段取り。lead：文字が出る時刻（成功系はコウモリの群れが文字の真ん中を通る / 失敗系は牙が噛み合ってから）/
  // bats：コウモリの数 / moon：赤い月の大きさ（文字の高さが単位、0で出さない）/ mist：赤い霧のリボン / flare：決めの血の閃光 / burst：散る火の粉の数 /
  // clap：失敗系で牙が噛み合う時刻 / tail：退場のあと演出が残る時間
  const VAMPIRE_PLAN = {
    success: { lead: 0.5, bats: 22, moon: 0, mist: 0, flare: 0, burst: 8 },
    special: { lead: 0.55, bats: 34, moon: 1.25, mist: 2, flare: 0, burst: 12 },
    extreme: { lead: 0.62, bats: 46, moon: 1.5, mist: 2, flare: 0.6, burst: 18 },
    critical: { lead: 0.7, bats: 70, moon: 1.85, mist: 3, flare: 1, burst: 28 },
    failure: { lead: 0.55, clap: 0.4, bats: 0, moon: 0, mist: 0, flare: 0, burst: 0 },
    fumble: { lead: 0.7, clap: 0.42, tail: 0.35, bats: 0, moon: 0, mist: 0, flare: 0, burst: 0 }
  };
  // 夢の判定のまたたき・ミストの動きを変える回数（1秒あたり。書き出しを軽くする）
  const DREAM_FPS = 8;
  // 星の判定の流れ星：傾き（右下へ）/ 速さ（画面の幅が単位、1秒あたり）
  const STAR_ANG = 0.42;
  const STAR_SPEED = 2.6;

  function rollTier(sfx) {
    return ROLL_TIERS.includes(sfx.tier) ? sfx.tier : 'success';
  }

  // 失敗で、斬撃・弾が文字を外れる時刻（場面の始めから）
  function rollMissAt(sfx) {
    if (sfx.type === 'blade') return BLADE_PLAN.failure.cuts[0].t + BLADE_PLAN.failure.cuts[0].sweep * 0.5;
    return SHOT_PLAN.failure.shots[0];
  }

  // 判定カットインの帯の中心と、上下・左右の半分の長さ（開ききったとき）。
  // solid：左右をぼかし始めるまでの半分の長さ。長い文字でも、文字の下は暗いまま読めるようにする
  const hh0 = band => band.hh;
  function rollBandRect(page, size, W) {
    const b = page.box;
    const solid = Math.max(W * 0.26, (b.x1 - b.x0) / 2 + size * 0.5);
    return { cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, hh: (b.y1 - b.y0) / 2 + size * 0.3, half: Math.max(W * 0.52, solid + W * 0.12), solid };
  }

  // 失敗の弾が当たる場所：文字の右の帯の上（画面からはみ出さないように寄せる）
  function shotMissSpot(mb, size, W) {
    return { x: Math.min(mb.x1 + size * 0.5, W - size * 0.6), y: mb.cy - size * 0.12 };
  }

  // 刃の光：x0 から x1（先端）まで細長く光る。ctx は一閃の向きに回してある
  function bladeSliver(ctx, x0, x1, th, color, alpha, scale) {
    if (alpha <= 0.002 || x1 - x0 <= 0.5 || th <= 0.05) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.shadowColor = color;
    ctx.shadowBlur = th * 2.5 * scale;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, colorWithAlpha(color, 0));
    g.addColorStop(0.6, 'rgba(255, 255, 255, 0.85)');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    const neck = x1 - (x1 - x0) * 0.12;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.quadraticCurveTo(neck, -th, x1, 0);
    ctx.quadraticCurveTo(neck, th, x0, 0);
    ctx.fill();
    ctx.restore();
  }

  // 一閃の跡：中央がいちばん太く明るく、両端は細く消える光の線
  function bladeLine(ctx, x0, x1, th, color, alpha, scale) {
    if (alpha <= 0.002 || x1 - x0 <= 0.5 || th <= 0.05) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(2, th * 5) * scale;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, colorWithAlpha(color, 0));
    g.addColorStop(0.5, '#ffffff');
    g.addColorStop(1, colorWithAlpha(color, 0));
    ctx.fillStyle = g;
    const mid = (x0 + x1) / 2;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.quadraticCurveTo(mid, -th, x1, 0);
    ctx.quadraticCurveTo(mid, th, x0, 0);
    ctx.fill();
    ctx.restore();
  }

  // 火花：(x, y) から飛び散る短い光のすじ。a は経過秒。dir を渡すとその向きを中心に spread の幅で散る
  function sparkBurst(ctx, x, y, a, n, seed, speed, gravity, len, color, life, width, dir = null, spread = TAU) {
    if (a < 0 || a > life) return;
    ctx.save();
    const base = ctx.globalAlpha;
    ctx.lineCap = 'round';
    ctx.lineWidth = width;
    for (let i = 0; i < n; i++) {
      const lifeI = life * (0.55 + 0.45 * rnd(seed, i, 3));
      if (a > lifeI) continue;
      const ang = dir === null ? rnd(seed, i, 1) * TAU : dir + (rnd(seed, i, 1) - 0.5) * spread;
      const v = speed * (0.35 + 0.65 * rnd(seed, i, 2));
      const vx = Math.cos(ang) * v, vy = Math.sin(ang) * v;
      const slow = 1 - 0.4 * a / lifeI;
      const px = x + vx * a * slow, py = y + vy * a * slow + 0.5 * gravity * a * a;
      const tvx = vx * slow, tvy = vy * slow + gravity * a;
      const tl = Math.hypot(tvx, tvy) || 1;
      const l = len * (1 - a / lifeI) * (0.6 + 0.4 * rnd(seed, i, 4));
      ctx.globalAlpha = base * clamp(1 - a / lifeI);
      ctx.strokeStyle = i % 3 === 0 ? '#ffffff' : color;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - tvx / tl * l, py - tvy / tl * l);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 集中線：中心へ向かう細い楔。frame ごとに少しずつ揺らぐ
  function speedLines(ctx, x, y, r0, r1, n, seed, frame, color, alpha, width) {
    if (alpha <= 0.002) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const ang = (i + rnd(seed, i, frame % 3) * 0.8) / n * TAU;
      const w = width * (0.3 + rnd(seed, i, 5 + frame % 4));
      const ra = r0 * (1 + 0.3 * rnd(seed, i, 9 + frame % 5));
      const c = Math.cos(ang), s = Math.sin(ang);
      ctx.moveTo(x + c * ra, y + s * ra);
      ctx.lineTo(x + c * r1 - s * w, y + s * r1 + c * w);
      ctx.lineTo(x + c * r1 + s * w, y + s * r1 - c * w);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  // 衝撃の輪
  function shockRing(ctx, x, y, r, width, color, alpha) {
    if (alpha <= 0.002 || width <= 0.05 || r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  function sfxOf(scene) {
    const sfx = scene.sfx || {};
    return SFX_TIMING[sfx.type] ? sfx : { type: 'none' };
  }

  // 剣と盾：強さで紋章の大きさを少しだけ変える（盾が帯に隠れない範囲）
  function crestScale(k) {
    return clamp(k, 0.85, 1.3);
  }

  function sfxTiming(scene) {
    const sfx = sfxOf(scene);
    if (sfx.type === 'blade') return { lead: BLADE_PLAN[rollTier(sfx)].lead, tail: SFX_TIMING.blade.tail };
    if (sfx.type === 'shot') return { lead: SHOT_PLAN[rollTier(sfx)].lead, tail: SFX_TIMING.shot.tail };
    if (sfx.type === 'star') { const pl = STAR_PLAN[rollTier(sfx)]; return { lead: pl.lead, tail: pl.tail ?? SFX_TIMING.star.tail }; }
    if (sfx.type === 'dream') { const pl = DREAM_PLAN[rollTier(sfx)]; return { lead: pl.lead, tail: pl.tail ?? SFX_TIMING.dream.tail }; }
    if (sfx.type === 'vampire') { const pl = VAMPIRE_PLAN[rollTier(sfx)]; return { lead: pl.lead, tail: pl.tail ?? SFX_TIMING.vampire.tail }; }
    return SFX_TIMING[sfx.type];
  }

  // メインの文字（サブを除く）が占める範囲。雷の走る場所や刀の切り口の高さに使う
  function mainBox(layout, page) {
    if (page.mainBoxCache) return page.mainBoxCache;
    const list = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = page.first; i < page.last; i++) {
      const g = layout.glyphs[i];
      if (g.group !== 0 || g.blank) continue;
      list.push(g);
      const h = g.size / 2;
      x0 = Math.min(x0, g.cx - h); x1 = Math.max(x1, g.cx + h);
      y0 = Math.min(y0, g.cy - h); y1 = Math.max(y1, g.cy + h);
    }
    if (!list.length) ({ x0, y0, x1, y1 } = page.box);
    page.mainBoxCache = { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, list };
    return page.mainBoxCache;
  }

  // 表示中の文字への作用（雷の脈動・刀の切れ目・サイバーのノイズ）
  function sfxBlock(bs, pg, t, scene, size) {
    const sfx = sfxOf(scene);
    const k = clamp(sfx.power ?? 1, 0, 3);
    if (sfx.type === 'lightning') {
      if (t >= pg.inEnd && t < pg.holdEnd) {
        const pulse = 0.5 + 0.5 * Math.sin(TAU * (t - pg.inEnd) / 0.8);
        bs.glowMul *= 1 + 0.9 * k * pulse;
        if (rnd(Math.floor(t * 15), 3, pg.index) < 0.18) bs.bright = Math.max(bs.bright, 0.22 * k);
      }
      const d = t - pg.holdEnd;
      if (scene.outEnabled !== false && d >= 0 && d < 0.25) bs.bright = Math.max(bs.bright, clamp((1 - d / 0.25) * 0.9 * k));
    } else if (sfx.type === 'katana') {
      const cut = katanaCut(pg);
      // 退場が「斬られて左右へ」でなければ、切れたあとは上下が少しずれたまま見せる
      if (t >= cut && !splitOut(pg)) {
        bs.split = Math.max(bs.split, size * 0.08 * k);
        bs.splitGap = Math.max(bs.splitGap, size * 0.03 * k);
      }
      // 切れた瞬間の衝撃（小さな揺れと光）
      const d = t - cut;
      if (d >= 0 && d < CUT_IMPACT) {
        const decay = Math.pow(1 - d / CUT_IMPACT, 2);
        bs.x += noise1(t * 40, 7) * size * 0.05 * k * decay;
        bs.y += noise1(t * 40, 19) * size * 0.03 * k * decay;
        bs.bright = Math.max(bs.bright, 0.6 * decay);
      }
    } else if (sfx.type === 'flame') {
      // 燃えている間は光彩がゆらめく
      if (t >= pg.inEnd - 0.3) bs.glowMul *= 1 + 0.2 * k * noise1(t * 5, 5 + pg.index);
    } else if (sfx.type === 'p5round') {
      const st = p5RoundState(pg, t, size);
      if (!st.shown) bs.a = 0;
      bs.s *= st.s; bs.x += st.x; bs.y += st.y; bs.r += st.r;
      // 止まった瞬間に白く光る
      const hit = t - (pg.textStart + P5_ZOOM * 0.55);
      if (hit >= 0 && hit < 0.2) bs.bright = Math.max(bs.bright, (1 - hit / 0.2) * 0.7 * k);
    } else if (sfx.type === 'p5round2') {
      const st = p5Round2State(pg, t, size);
      if (!st.shown) bs.a = 0;
      bs.s *= st.s; bs.x += st.x; bs.y += st.y; bs.r += st.r;
      const hit = t - (pg.textStart + P5_ZOOM2 * 0.6);
      if (hit >= 0 && hit < 0.2) bs.bright = Math.max(bs.bright, (1 - hit / 0.2) * 0.6 * k);
    } else if (sfx.type === 'p5gun') {
      const st = p5GunState(pg, t, size, scene.width);
      bs.x += st.x; bs.y += st.y; bs.r += st.r;
    } else if (sfx.type === 'blade' || sfx.type === 'shot') {
      const tier = rollTier(sfx);
      const d = t - pg.textStart;
      const big = tier === 'critical';
      const mid = tier === 'extreme';
      // 決めの瞬間：白く光って少し大きく叩きつける（イクストリーム・決定的成功・致命的失敗は揺れも）
      if (tier !== 'failure' && d >= 0 && d < 0.3) {
        const e = 1 - d / 0.3;
        const shot = sfx.type === 'shot';
        bs.bright = Math.max(bs.bright, clamp((big ? 1 : mid ? 0.95 : tier === 'fumble' ? 0.5 : 0.85) * e * e));
        bs.s *= 1 + (big ? (shot ? 0.3 : 0.16) : mid ? (shot ? 0.24 : 0.12) : tier === 'fumble' ? 0.04 : (shot ? 0.18 : 0.09)) * k * e * e * e;
        if (big || mid || tier === 'fumble' || shot) {
          const amp = big ? 0.06 : mid ? 0.045 : 0.03;
          bs.x += noise1(t * 40, 7) * size * amp * k * e * e;
          bs.y += noise1(t * 40, 19) * size * amp * 0.8 * k * e * e;
        }
      }
      // 失敗：外れたあと少しだけ沈む
      if (tier === 'failure') {
        const m = t - (pg.start + rollMissAt(sfx));
        if (m >= 0) bs.y += size * 0.05 * EASE.outCubic(clamp(m / 0.9));
      }
      if (sfx.type === 'blade') {
        const cut = BLADE_PLAN[tier].cuts[0];
        if (tier === 'fumble' && d >= 0) {
          // 刀が折れた：文字は一閃の向きに割れてずれたまま。退場では下の半分から落ちる
          const q = outProgress(pg, t);
          bs.split = Math.max(bs.split, size * 0.12 * k);
          bs.splitGap = Math.max(bs.splitGap, size * 0.05 * k);
          bs.splitAngle = cut.ang;
          bs.splitFall = size * 1.6 * EASE.inQuad(q);
        } else if (splitOut(pg)) {
          // 「斬られて左右へ」は最初の一閃と同じ向きに切れる
          bs.splitAngle = cut.ang;
        }
      }
    } else if (sfx.type === 'star') {
      const tier = rollTier(sfx);
      const d = t - pg.textStart;
      if (tier === 'fumble') {
        // 引き寄せられて現れる：少し大きいところから縮んで止まり、震える。表示中は重力でゆっくり揺らぐ
        if (d >= 0 && d < 0.45) {
          const e = 1 - d / 0.45;
          bs.s *= 1 + 0.1 * k * e * e;
          bs.bright = Math.max(bs.bright, 0.4 * e * e);
          bs.x += noise1(t * 36, 7) * size * 0.035 * k * e;
          bs.y += noise1(t * 36, 19) * size * 0.025 * k * e;
        }
        if (d >= 0.45) {
          // 揺らぎは1秒に STAR_TWINKLE_FPS 回だけ変える（書き出しを軽くする）
          const tq = Math.floor(t * STAR_TWINKLE_FPS) / STAR_TWINKLE_FPS;
          const w = clamp((tq - pg.textStart - 0.45) / 0.6);
          bs.r += 0.012 * k * Math.sin(tq * 2.1) * w;
          bs.s *= 1 + 0.012 * k * Math.sin(tq * 3.3 + 1) * w;
        }
      } else if (tier === 'failure') {
        // 流れ星が届かずに消えたあと、少しだけ沈んで暗くなる
        const m = t - (pg.start + STAR_PLAN.failure.fizzle);
        if (m >= 0) bs.y += size * 0.04 * EASE.outCubic(clamp(m / 0.9));
      } else if (d >= 0 && d < 0.5) {
        // 星が通った瞬間：白く光って、ふわりと少しだけ大きく
        const e = 1 - d / 0.5;
        const big = tier === 'critical' ? 1 : tier === 'extreme' ? 0.8 : tier === 'special' ? 0.6 : 0.45;
        bs.bright = Math.max(bs.bright, clamp((0.55 + 0.45 * big) * e * e));
        bs.s *= 1 + 0.08 * big * k * e * e * e;
      }
    } else if (sfx.type === 'fang') {
      // 噛み合った衝撃で文字が叩きつけられる：白く光って少し大きく、震えて収まる
      const d = t - pg.textStart;
      if (d >= 0 && d < 0.45) {
        const e = 1 - d / 0.45;
        bs.bright = Math.max(bs.bright, clamp(0.7 * e * e * e));
        bs.s *= 1 + 0.07 * k * e * e * e;
        bs.x += noise1(t * 42, 7) * size * 0.03 * k * e * e;
        bs.y += noise1(t * 42, 19) * size * 0.022 * k * e * e;
      }
    } else if (sfx.type === 'vampire') {
      const tier = rollTier(sfx);
      const d = t - pg.textStart;
      if (tier === 'fumble') {
        // 噛み砕かれた衝撃のあとに現れる：震えて、血に染まったように少し沈む
        const sh = d >= 0 && d < 0.5 ? Math.pow(1 - d / 0.5, 2) : 0;
        bs.x += noise1(t * 34, 7) * size * 0.035 * k * sh;
        bs.y += noise1(t * 34, 19) * size * 0.025 * k * sh;
        if (d >= 0.3) {
          const w = clamp((t - pg.textStart - 0.3) / 0.6);
          bs.r += 0.012 * k * Math.sin(t * 2.1) * w;
          bs.y += size * 0.03 * w;
        }
      } else if (tier === 'failure') {
        if (d >= 0) bs.y += size * 0.035 * EASE.outCubic(clamp(d / 0.8));
        if (d >= 0 && d < 0.25) bs.x += noise1(t * 30, 5) * size * 0.015 * (1 - d / 0.25);
      } else if (d >= 0 && d < 0.5) {
        // コウモリが抜けた瞬間：赤く光って、ふわりと少しだけ大きく
        const e = 1 - d / 0.5;
        const big = tier === 'critical' ? 1 : tier === 'extreme' ? 0.8 : tier === 'special' ? 0.6 : 0.45;
        bs.bright = Math.max(bs.bright, clamp((0.4 + 0.4 * big) * e * e));
        bs.s *= 1 + 0.07 * big * k * e * e * e;
      }
    } else if (sfx.type === 'dream') {
      const tier = rollTier(sfx);
      const d = t - pg.textStart;
      if (tier === 'fumble') {
        // ミストにのまれて現れる：少し震えて、そのあとゆっくり沈むように揺らぐ
        if (d >= 0 && d < 0.45) {
          const e = 1 - d / 0.45;
          bs.bright = Math.max(bs.bright, 0.25 * e * e);
          bs.x += noise1(t * 30, 7) * size * 0.03 * k * e;
          bs.y += noise1(t * 30, 19) * size * 0.02 * k * e;
        }
        if (d >= 0.3) {
          const tq = Math.floor(t * DREAM_FPS) / DREAM_FPS;
          const w = clamp((tq - pg.textStart - 0.3) / 0.6);
          bs.r += 0.014 * k * Math.sin(tq * 2.3) * w;
          bs.y += size * 0.035 * w;
        }
      } else if (tier === 'failure') {
        // 星が文字に届かずに消えたあと、少しだけ沈む
        const m = t - (pg.start + 0.6);
        if (m >= 0) bs.y += size * 0.04 * EASE.outCubic(clamp(m / 0.9));
      } else if (d >= 0 && d < 0.5) {
        // 光る星が通った瞬間：白くふわりと光って、少しだけ大きく
        const e = 1 - d / 0.5;
        const big = tier === 'critical' ? 1 : tier === 'extreme' ? 0.8 : tier === 'special' ? 0.6 : 0.45;
        bs.bright = Math.max(bs.bright, clamp((0.5 + 0.4 * big) * e * e));
        bs.s *= 1 + 0.07 * big * k * e * e * e;
      }
    } else if (sfx.type === 'cyber') {
      const c = (t - pg.start) % CYBER_BURST;
      if (t >= pg.inEnd && t < pg.holdEnd && c < 0.1) bs.glitch = Math.max(bs.glitch, 0.4 * k);
    }
  }

  function splitOut(pg) {
    return Boolean(pg.blockOut && pg.blockOut.fx.id === 'split');
  }

  // 刀の一閃が文字を切る時刻：退場の始め（退場が「斬られて左右へ」なら、その切れる瞬間）
  function katanaCut(pg) {
    if (splitOut(pg)) return pg.blockOut.start + pg.blockOut.dur * SPLIT_CUT;
    return pg.holdEnd + SLASH_SWEEP;
  }

  // 退場に合わせて演出を薄くする係数（退場しない場合は1のまま）
  function outProgress(pg, t) {
    if (!Number.isFinite(pg.outEnd) || t < pg.holdEnd) return 0;
    return clamp((t - pg.holdEnd) / Math.max(0.05, pg.outEnd - pg.holdEnd));
  }

  function diamond(ctx, x, y, r, color) {
    if (r <= 0) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.72, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.72, y);
    ctx.closePath();
    ctx.fill();
  }

  // 4方向に光が伸びるきらめき
  function twinkle(ctx, x, y, r, color, alpha) {
    if (alpha <= 0.002 || r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.12, y - r * 0.12); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.12, y + r * 0.12);
    ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.12, y + r * 0.12); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.12, y - r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 盾の輪郭の右半分（上辺の中央 → 右上の角 → 右の辺 → 下の先端）。原点が中心。上辺は中央が少し下がる
  function shieldHalf(w, h) {
    const hw = w / 2, pts = [];
    const top = -h * 0.44, corner = -h * 0.5, side = -h * 0.06, bot = h * 0.5;
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      pts.push([hw * u, lerp(top, corner, u * u)]);
    }
    pts.push([hw, side]);
    for (let i = 1; i <= 16; i++) {
      const u = i / 16, v = 1 - u;
      const x = v * v * v * hw + 3 * v * v * u * hw + 3 * v * u * u * hw * 0.42;
      const y = v * v * v * side + 3 * v * v * u * h * 0.24 + 3 * v * u * u * h * 0.42 + u * u * u * bot;
      pts.push([x, y]);
    }
    return pts;
  }

  function mirrorX(pts) {
    return pts.map(([x, y]) => [-x, y]);
  }

  // 折れ線の一部（from〜to は長さの割合 0〜1）をパスに足す
  function polyPartial(ctx, pts, from, to) {
    from = clamp(from); to = clamp(to);
    if (to <= from) return;
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = lens[lens.length - 1] || 1;
    const at = s => {
      let i = 1;
      while (i < pts.length - 1 && lens[i] < s) i++;
      const u = clamp((s - lens[i - 1]) / ((lens[i] - lens[i - 1]) || 1));
      return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
    };
    const s0 = from * total, s1 = to * total;
    const a = at(s0), b = at(s1);
    ctx.moveTo(a[0], a[1]);
    for (let i = 1; i < pts.length - 1; i++) if (lens[i] > s0 && lens[i] < s1) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(b[0], b[1]);
  }

  // 剣（線画）：原点が2本の交わる点、切っ先が上。金の細い線で縁取る（dark を渡すと刃と柄をその色で塗る）
  function drawSwordLine(ctx, L, gold, dark, lw) {
    const bw = L * 0.026;
    const tip = -L * 0.47, guard = L * 0.27, grip = L * 0.385;
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    ctx.strokeStyle = gold;
    ctx.fillStyle = dark || 'rgba(0, 0, 0, 0)';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, tip);
    ctx.lineTo(bw, tip + bw * 4);
    ctx.lineTo(bw, guard);
    ctx.lineTo(-bw, guard);
    ctx.lineTo(-bw, tip + bw * 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 樋（刃の中央の細い線）
    ctx.lineWidth = lw * 0.5;
    ctx.beginPath(); ctx.moveTo(0, tip + bw * 6); ctx.lineTo(0, guard - bw * 1.5); ctx.stroke();
    // 柄と柄頭
    const hw = bw * 0.55, pr = bw * 0.95;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.rect(-hw, guard, hw * 2, grip - guard); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, grip); ctx.lineTo(pr * 0.75, grip + pr); ctx.lineTo(0, grip + pr * 2); ctx.lineTo(-pr * 0.75, grip + pr);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 鍔：細い横棒と両端の小さなひし形
    const gw = L * 0.1;
    ctx.lineWidth = lw * 1.7;
    ctx.beginPath(); ctx.moveTo(-gw, guard); ctx.lineTo(gw, guard); ctx.stroke();
    diamond(ctx, -gw, guard, lw * 2.4, gold);
    diamond(ctx, gw, guard, lw * 2.4, gold);
  }

  // 弾痕：黒い穴・細い白い輪・まっすぐなひび。grow でひびが伸びる
  function drawBulletHole(ctx, x, y, size, seed, grow, alpha, dark) {
    if (alpha <= 0.002) return;
    const R = size * 0.05;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, size * 0.011);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i + rnd(seed, i, 5) * 0.6) / 6 * TAU;
      const r0 = R * 1.7, r1 = r0 + size * (0.1 + rnd(seed, i, 7) * 0.18) * grow;
      ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0);
      ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1);
    }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, R * 1.55, 0, TAU); ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // 炎：火が左から右へ走る範囲（メインの文字の左右に少し余裕をとる）と、位置 x に火がつく時刻
  function flameSpan(mb, size) {
    return { L: mb.x0 - size * FLAME_PAD, R: mb.x1 + size * FLAME_PAD };
  }

  function flameIgnite(pg, span, x) {
    return pg.start + FLAME_RUN * clamp((x - span.L) / Math.max(1, span.R - span.L));
  }

  // 「燃えて消える」退場の燃え際（文字の層の座標。この位置より左はもう燃えて消えている）
  function burnFront(pg, page, t, scene, size) {
    const bo = pg.blockOut;
    if (!bo || bo.fx.id !== 'burn' || t < bo.start) return null;
    const p = easeFn(scene.outEase, bo.fx.ease)(clamp((t - bo.start) / bo.dur));
    const s = size * BURN_SOFT;
    // 炎の演出があるときは帯の端から端まで、なければ文字の範囲を燃やす
    if (pg.flameSpan) return { x: lerp(pg.flameSpan.L - s, pg.flameSpan.R, p), p, soft: s };
    const b = page.box, pad = size * 0.25;
    return { x: lerp(b.x0 - pad - s, b.x1 + pad, p), p, soft: s };
  }

  // 「光の粒になって消える」退場のほどけ際（文字の層の座標。この位置より左はもうほどけて消えている）
  function fireflyFront(pg, page, t, size) {
    const bo = pg.blockOut;
    if (!bo || bo.fx.id !== 'firefly' || t < bo.start) return null;
    const p = clamp((t - bo.start) / bo.dur);
    const s = size * FIREFLY_SOFT;
    const b = page.box, pad = size * 0.2;
    const x0 = b.x0 - pad - s, x1 = b.x1 + pad;
    return { x: lerp(x0, x1, clamp(p / FIREFLY_SWEEP)), x0, x1, p, soft: s };
  }

  // 「炎に包まれて燃え尽きる」退場の燃え際（文字の層の座標。この位置より左はもう燃え尽きている）
  function blazeFront(pg, page, t, size) {
    const bo = pg.blockOut;
    if (!bo || bo.fx.id !== 'blaze' || t < bo.start) return null;
    const p = clamp((t - bo.start) / bo.dur);
    const b = page.box;
    const x0 = b.x0 - size * 0.6, x1 = b.x1 + size * 0.6;
    return { x: lerp(x0, x1, clamp(p / BLAZE_SWEEP)), x0, x1, p };
  }

  // 燃え際のゆらぎ：高さ y での燃え際の位置（まっすぐな線ではなく、ゆっくりうねる）
  function blazeEdge(front, y, t, size, seed) {
    return front + (noise1(y / size * 2.2 + t * 0.9, seed) * 0.4 + noise1(y / size * 7 - t * 2.5, seed + 5) * 0.12) * size;
  }

  // 炎の舌：根元が太く、先へ行くほど細く大きくゆらぐ形。下から上へ inner → outer の色で塗り、先は透ける
  function flameTongue(ctx, x, y, w, h, t, seed, inner, outer, alpha) {
    if (alpha <= 0.002 || h <= 1) return;
    const n = 10, left = [], right = [];
    for (let i = 0; i <= n; i++) {
      const v = i / n;
      const cx = x + noise1(t * 2.4 - v * 1.8, seed) * w * 1.2 * v * v + noise1(t * 6 - v * 3, seed + 7) * w * 0.22 * v;
      const hw = w / 2 * Math.pow(1 - v, 0.85) * (1 + 0.3 * Math.sin(Math.PI * clamp(v * 2.4)));
      left.push([cx - hw, y - h * v]);
      right.push([cx + hw, y - h * v]);
    }
    const pts = left.concat(right.reverse());
    const g = ctx.createLinearGradient(0, y, 0, y - h);
    g.addColorStop(0, colorWithAlpha(inner, clamp(alpha)));
    g.addColorStop(0.45, colorWithAlpha(outer, clamp(alpha * 0.85)));
    g.addColorStop(1, colorWithAlpha(outer, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.closePath();
    ctx.fill();
  }

  // 2つの色を混ぜる（#rrggbb）
  function mixHex(a, b, u) {
    const pa = parseInt(String(a).slice(1, 7), 16), pb = parseInt(String(b).slice(1, 7), 16);
    if (!Number.isFinite(pa) || !Number.isFinite(pb)) return a;
    const ch = sh => Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, u));
    return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
  }

  // 色の色相（度）と彩度（0〜1）
  function hexHue(hex) {
    const v = parseInt(String(hex || '').slice(1, 7), 16);
    if (!Number.isFinite(v)) return null;
    const r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 1e-6) return { h: 0, s: 0 };
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    return { h: h < 0 ? h + 360 : h, s: mx > 0 ? d / mx : 0 };
  }

  // 炎の色相の回転（度）：演出の色の色相と基準の橙との差。灰色に近い色では回さない
  function fireHue(color) {
    const c = hexHue(color), base = hexHue(FIRE_BASE);
    if (!c || c.s < 0.15) return 0;
    return c.h - base.h;
  }

  // 書き出しの長さ D を一周 near 秒くらいの整数個に割った長さ（D の終わりが始めにつながる）
  function loopPeriod(D, near) {
    return D / Math.max(1, Math.round(D / near));
  }

  // 稲妻の折れ線（中点をずらしていく。同じ seed なら同じ形）
  function boltPoints(x0, y0, x1, y1, seed, depth, rough) {
    let pts = [[x0, y0], [x1, y1]];
    let disp = Math.hypot(x1 - x0, y1 - y0) * rough;
    for (let d = 0; d < depth; d++) {
      const next = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const off = (rnd(seed, d * 97 + i, 5) - 0.5) * 2 * disp;
        next.push([(ax + bx) / 2 - (by - ay) / len * off, (ay + by) / 2 + (bx - ax) / len * off], pts[i + 1]);
      }
      pts = next;
      disp *= 0.55;
    }
    return pts;
  }

  // 稲妻：本体と、途中から分かれる枝
  function boltWithBranches(x0, y0, x1, y1, seed) {
    const main = boltPoints(x0, y0, x1, y1, seed, 6, 0.2);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const paths = [{ pts: main, w: 1 }];
    [0.3, 0.55].forEach((at, bi) => {
      const from = main[Math.floor(main.length * at)];
      const ang = Math.atan2(y1 - y0, x1 - x0) + (rnd(seed, 300 + bi, 9) < 0.5 ? -1 : 1) * (0.45 + rnd(seed, 310 + bi, 9) * 0.5);
      const bl = len * (0.22 + rnd(seed, 320 + bi, 9) * 0.18);
      paths.push({ pts: boltPoints(from[0], from[1], from[0] + Math.cos(ang) * bl, from[1] + Math.sin(ang) * bl, seed + 17 + bi, 4, 0.22), w: 0.45 });
    });
    return paths;
  }

  function strokePath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  // 光る線：外側のにじみ（色）→ 芯（白）
  // 電気の線：細くにじむ光の上に、根元から先へ細くなる芯と白い芯線。脇にもう1本、細くゆれる筋を添える。
  // 角は丸めず鋭く折る。加算で重ねるので、交わったところほど明るい
  function drawGlowPath(ctx, pts, width, color, alpha, scale, taper = 0.7) {
    if (alpha <= 0.002 || pts.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(alpha);
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = width * 7 * scale;
    ctx.strokeStyle = colorWithAlpha(color, 0.22);
    ctx.lineWidth = width * 2.6;
    strokePath(ctx, pts);
    ctx.shadowBlur = 0;
    const n = pts.length - 1, chunks = Math.min(8, n);
    const pass = (list, w, col) => {
      ctx.strokeStyle = col;
      for (let c = 0; c < chunks; c++) {
        const i0 = Math.floor(c * n / chunks), i1 = Math.floor((c + 1) * n / chunks);
        ctx.lineWidth = Math.max(0.5, w * (1 - taper * (c + 0.5) / chunks));
        ctx.beginPath();
        ctx.moveTo(list[i0][0], list[i0][1]);
        for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(list[i][0], list[i][1]);
        ctx.stroke();
      }
    };
    // 脇の細い筋：本体から少しずれて、ところどころ離れる
    const seed = Math.floor(Math.abs(pts[0][0] * 7 + pts[n][1] * 13));
    const side = pts.map(([x, y], i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const off = (rnd(seed, i, 31) - 0.5) * width * 3.2 * Math.sin(Math.PI * i / n);
      return [x - (b[1] - a[1]) / len * off, y + (b[0] - a[0]) / len * off];
    });
    pass(side, width * 0.45, colorWithAlpha(color, 0.75));
    pass(pts, width * 1.15, color);
    pass(pts, width * 0.45, '#ffffff');
    ctx.restore();
  }

  // 中心から広がる光（透過のまま、中心ほど白く）
  function drawFlash(ctx, x, y, r, color, alpha, squash = 1) {
    if (alpha <= 0.002 || r <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, squash);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(255, 255, 255, ${clamp(alpha)})`);
    g.addColorStop(0.35, colorWithAlpha(color, clamp(alpha * 0.55)));
    g.addColorStop(1, colorWithAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  class TextRenderer {
    constructor(options = {}) {
      this.resolveFont = options.resolveFont || (() => ['sans-serif']);
      this.layer = makeCanvas(8, 8);
      this.lctx = this.layer.getContext('2d');
      this.tmpA = makeCanvas(8, 8);
      this.tmpB = makeCanvas(8, 8);
      this.blurTmp = makeCanvas(8, 8);
      this.bandCanvas = makeCanvas(8, 8);
      this.measure = makeCanvas(8, 8).getContext('2d');
      this.prepared = null;
      this.spriteKey = '';
      this.sprites = null;
      this.soloCache = new Map();
      this.soloKey = '';
      this.soloPixels = 0;
      this.st = { a: 1, x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, blur: 0 };
    }

    fontsFor(scene) {
      const mainFam = fontFamiliesFor(scene, 0, this.resolveFont);
      const subFam = fontFamiliesFor(scene, 1, this.resolveFont);
      const mainWeight = scene.weight || 700;
      const subWeight = scene.subWeight || mainWeight;
      return {
        mainFont: size => fontString(mainFam, mainWeight, size, scene.italic),
        subFont: size => fontString(subFam, subWeight, size, scene.subItalic)
      };
    }

    prepare(scene) {
      const fonts = this.fontsFor(scene);
      const layout = computeLayout(scene, { ctx: this.measure, mainFont: fonts.mainFont, subFont: fonts.subFont });
      const timeline = buildTimeline(scene, layout);
      const spriteKey = JSON.stringify([
        scene.text, scene.subText, scene.mode, scene.reveal, scene.pageSplit, scene.width, scene.height, scene.fontId, scene.subFontId,
        scene.weight, scene.subWeight, scene.italic, scene.subItalic, scene.fontSize, scene.letterSpacing, scene.subLetterSpacing, scene.lineHeight,
        scene.subSize, scene.subGap, scene.subPosition, scene.writing, scene.align, scene.anchor, scene.marginX, scene.marginY,
        scene.offsetX, scene.offsetY, scene.autoFit, scene.wrapChars, scene.fill, scene.fillOpacity, scene.stroke, scene.stroke2,
        scene.shadow, scene.glow, scene.subColorOn, scene.subColor, scene.deco && scene.deco.type, scene.deco && scene.deco.pad,
        scene.deco && scene.deco.extend, scene.deco && scene.deco.thickness, scene.deco && scene.deco.tapeSize, this.fontEpoch || 0
      ]);
      if (spriteKey !== this.spriteKey || !this.sprites) {
        this.sprites = this.buildSprites(scene, layout, fonts);
        this.spriteKey = spriteKey;
      } else {
        layout.glyphs.forEach((g, i) => { g.sprite = this.sprites.list[i]; });
      }
      this.prepared = { scene, layout, timeline };
      return this.prepared;
    }

    invalidateSprites() {
      this.spriteKey = '';
      this.fontEpoch = (this.fontEpoch || 0) + 1;
    }

    buildSprites(scene, layout, fonts) {
      const cache = new Map();
      const list = new Array(layout.glyphs.length).fill(null);
      const posDependent = scene.fill && scene.fill.type === 'gradient' && (scene.fill.dir === 'h' || scene.fill.dir === 'd');
      layout.glyphs.forEach((g, i) => {
        if (g.blank) return;
        const page = layout.pages[g.page];
        const size = g.size;
        const font = g.group === 1 ? fonts.subFont(size) : fonts.mainFont(size);
        const style = groupStyle(scene, g.group, size);
        const metrics = g.group === 1 ? page.subMetrics : page.mainMetrics;
        const gradient = { w: page.box.x1 - page.box.x0, h: page.box.y1 - page.box.y0, inkA: metrics ? metrics.inkA : size * 0.8, inkD: metrics ? metrics.inkD : size * 0.2 };
        const key = posDependent ? `i${i}` : `${g.group}|${g.ch}|${g.rot ? 1 : 0}|${g.page}`;
        let sprite = cache.get(key);
        if (!sprite) {
          sprite = buildGlyphSprite(g, font, style, gradient);
          cache.set(key, sprite);
        }
        list[i] = sprite;
        g.sprite = sprite;
      });
      return { list, cache };
    }

    ensureLayer(w, h) {
      [this.layer, this.tmpA, this.tmpB].forEach(c => {
        if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      });
    }

    glyphState(g, t, scene, info, st) {
      const T = this.prepared.timeline;
      const i = g.index;
      const inStart = T.inStart[i];
      if (!(t >= inStart)) return false;
      const outStart = T.outStart[i];
      if (t >= outStart && (T.outDur[i] === 0 || t >= outStart + T.outDur[i])) return false;
      st.a = 1; st.x = 0; st.y = 0; st.s = 1; st.sx = 1; st.sy = 1; st.r = 0; st.blur = 0;
      const sp = T.pages[g.page].spread;
      if (sp && t < sp.start + sp.dur) {
        // 行ごとに中央で（少し左右にばらけて）重なって現れ（少し大きい状態から）、行の向きに広がって本来の位置へ
        const a = clamp((t - sp.appear) / SPREAD_APPEAR);
        const k = t < sp.start ? 0 : EASE.outQuart(clamp((t - sp.start) / sp.dur));
        st.a = EASE.outQuad(a) * lerp(stackAlpha(g), 1, k);
        st.s = 1 + 0.25 * (1 - EASE.outCubic(a));
        const pull = (1 - k) * (1 - (g.spreadLoose ?? SPREAD_LOOSE));
        if (g.vertical) st.y = (sp.cy - g.cy) * pull;
        else st.x = (sp.cx - g.cx) * pull;
      }
      const inFx = T.inFx[i];
      const inDur = T.inDur[i];
      if (inFx && inFx.glyph && inDur > 0 && t < inStart + inDur) {
        const p = clamp((t - inStart) / inDur);
        info.ease = easeFn(scene.inEase, inFx.ease);
        inFx.glyph(st, info.ease(p), p, g, scene.inPower ?? 1, info);
      }
      const outFx = T.outFx[i];
      if (outFx && outFx.glyph && t >= outStart) {
        const od = T.outDur[i];
        const p = od > 0 ? clamp((t - outStart) / od) : 1;
        const e = easeFn(scene.outEase, outFx.ease)(p);
        outFx.glyph(st, e, p, g, scene.outPower ?? 1, info);
      }
      const hold = HOLD_MAP[scene.holdFx];
      if (hold && hold.glyph) hold.glyph(st, t, g, scene.holdPower ?? 1);
      return st.a > 0.002;
    }

    blockState(pg, t, scene, size) {
      const bs = { a: 1, x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, blur: 0, bright: 0, glitch: 0, mask: null, glowMul: 1, layerAlpha: 1, split: 0, splitGap: 0, splitAngle: 0, splitFall: 0 };
      const seed = 91 + pg.index * 13;
      if (pg.blockIn) {
        const bi = pg.blockIn;
        if (t < bi.start) { bs.a = 0; return bs; }
        if (t < bi.start + bi.dur) {
          const p = clamp((t - bi.start) / bi.dur);
          const e = easeFn(scene.inEase, bi.fx.ease)(p);
          bi.fx.block(bs, e, p, scene.inPower ?? 1, { size, t, dir: dirFor(bi.fx, scene.inDir), seed });
        }
      }
      if (pg.blockOut) {
        const bo = pg.blockOut;
        if (t >= bo.start + bo.dur) { bs.a = 0; return bs; }
        if (t >= bo.start) {
          const p = clamp((t - bo.start) / bo.dur);
          const e = easeFn(scene.outEase, bo.fx.ease)(p);
          bo.fx.block(bs, e, p, scene.outPower ?? 1, { size, t, dir: dirFor(bo.fx, scene.outDir), seed });
        }
      }
      const hold = HOLD_MAP[scene.holdFx];
      if (hold && hold.block) hold.block(bs, t, scene.holdPower ?? 1, { size, seed, since: t - pg.inEnd });
      if (pg.solo) {
        // 全文が出た瞬間：少し大きく叩きつけてから落ち着く（小さな揺れと光つき）
        const d = t - pg.solo.full;
        const k = clamp(scene.soloImpact ?? 1, 0, 3);
        if (k > 0 && d >= 0 && d < SOLO_PUNCH) {
          const e = 1 - d / SOLO_PUNCH;
          const decay = e * e * e;
          const f = Math.floor(t * 30);
          bs.s *= 1 + Math.min(0.2 * k, pg.solo.room - 1) * decay;
          bs.x += (rnd(f, 3, seed) - 0.5) * size * 0.06 * k * decay;
          bs.y += (rnd(f, 5, seed) - 0.5) * size * 0.06 * k * decay;
          bs.bright = Math.max(bs.bright, clamp(0.6 * k * decay));
        }
      }
      if (pg.scroll) {
        const sc = pg.scroll;
        const p = sc.dur > 0 ? clamp((t - sc.start) / sc.dur) : 1;
        const off = lerp(sc.from, sc.to, p);
        if (sc.vertical) bs.x += off; else bs.y += off;
      }
      sfxBlock(bs, pg, t, scene, size);
      return bs;
    }

    decoProgress(pg, t) {
      let pin = 1, pout = 0;
      if (pg.decoIn) pin = pg.decoIn.dur > 0 ? clamp((t - pg.decoIn.start) / pg.decoIn.dur) : (t >= pg.decoIn.start ? 1 : 0);
      else if (t < pg.start) pin = 0;
      if (pg.decoOut) pout = pg.decoOut.dur > 0 ? clamp((t - pg.decoOut.start) / pg.decoOut.dur) : (t >= pg.decoOut.start ? 1 : 0);
      return { pin, pout };
    }

    render(ctx, t, options = {}) {
      const P = this.prepared;
      if (!P) return;
      const { scene, layout, timeline } = P;
      const scale = options.scale || 1;
      const cw = ctx.canvas.width, ch = ctx.canvas.height;
      this.ensureLayer(cw, ch);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.restore();
      this.drawBackground(ctx, t, scale);
      this.drawEnv(ctx, t, scale, scene, 'behind');
      if (sfxOf(scene).type === 'fireWall') this.drawFireWall(ctx, t, scale, scene);
      const size = layout.size;
      timeline.pages.forEach(pg => {
        const page = layout.pages[pg.index];
        if (t < pg.start) return;
        if (Number.isFinite(pg.end) && t > pg.end) return;
        // 文字のない牙の戦闘演出：文字は描かず、牙の演出だけを描く
        if (sfxOf(scene).type === 'fangFx' || sfxOf(scene).type === 'clawMark' || sfxOf(scene).type === 'katanaFx' || sfxOf(scene).type === 'zangekiHard' || sfxOf(scene).type === 'bulletMark') { this.drawSfx(ctx, pg, page, t, scale, scene, 'back'); this.drawSfx(ctx, pg, page, t, scale, scene, 'front'); return; }
        if (!page.visibleCount) return;
        const bs = this.blockState(pg, t, scene, size);
        this.drawSfx(ctx, pg, page, t, scale, scene, 'back');
        this.drawDeco(ctx, pg, page, t, bs, scale, scene);
        if (bs.a > 0.002) {
          this.drawTextLayer(pg, page, t, bs, scale, scene);
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = clamp(bs.layerAlpha);
          if (bs.split > 0.01 || bs.splitFall > 0.01) {
            // 斬られた文字：切り口（傾き splitAngle）より上は刃の向きへ、下は逆へずらして描く。splitFall で下の半分から落ちる
            const mbx = mainBox(layout, page);
            const px = (mbx.cx + bs.x) * scale, py = (mbx.cy + bs.y) * scale;
            const ux = Math.cos(bs.splitAngle), uy = Math.sin(bs.splitAngle), nx = -uy, ny = ux;
            const d = bs.split * scale;
            const gap = bs.splitGap * scale / 2;
            const fall = bs.splitFall * scale;
            const far = (cw + ch) * 2;
            const half = side => {
              ctx.beginPath();
              ctx.moveTo(px - ux * far, py - uy * far);
              ctx.lineTo(px + ux * far, py + uy * far);
              ctx.lineTo(px + ux * far + nx * far * side, py + uy * far + ny * far * side);
              ctx.lineTo(px - ux * far + nx * far * side, py - uy * far + ny * far * side);
              ctx.closePath();
            };
            ctx.save();
            half(-1); ctx.clip();
            ctx.drawImage(this.layer, ux * d - nx * gap, uy * d - ny * gap + fall * 0.25);
            ctx.restore();
            half(1); ctx.clip();
            ctx.drawImage(this.layer, -ux * d + nx * gap, -uy * d + ny * gap + fall);
          } else {
            ctx.drawImage(this.layer, 0, 0);
          }
          ctx.restore();
        }
        this.drawFireflies(ctx, pg, page, t, scale, scene, bs);
        this.drawStardust(ctx, pg, page, t, scale, scene, bs);
        this.drawAshText(ctx, pg, page, t, scale, scene, bs);
        this.drawBlaze(ctx, pg, page, t, scale, bs);
        this.drawSfx(ctx, pg, page, t, scale, scene, 'front');
      });
      this.drawEnv(ctx, t, scale, scene, 'front');
    }

    // 炎に包まれて燃え尽きる：燃え際が通ったところの文字から炎が立ちのぼってしばらく燃え、火の粉が舞い上がり、薄い煙が昇る
    drawBlaze(ctx, pg, page, t, scale, bs) {
      const { layout } = this.prepared;
      const size = layout.size;
      const bf = blazeFront(pg, page, t, size);
      if (!bf) return;
      const bo = pg.blockOut;
      const end = bo.start + bo.dur;
      const sweep = bo.dur * BLAZE_SWEEP;
      const ignite = x => bo.start + sweep * clamp((x - bf.x0) / Math.max(1, bf.x1 - bf.x0));
      const tail = clamp((end - t) / 0.4);
      const glyphs = [];
      for (let i = page.first; i < page.last; i++) {
        const g = layout.glyphs[i];
        if (g && !g.blank) glyphs.push([i, g]);
      }
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      // 煙：燃えたあとから薄く昇って広がる
      glyphs.forEach(([i, g]) => {
        for (let j = 0; j < 3; j++) {
          const x0 = g.cx + bs.x + (rnd(i, j, 51) - 0.5) * g.size * 0.8;
          const born = ignite(x0) + 0.15 + rnd(i, j, 52) * 0.35;
          const a = t - born;
          const life = Math.min(1.3 + rnd(i, j, 53) * 0.6, end - born);
          if (a < 0 || a >= life) continue;
          const q = a / life;
          const x = x0 + size * (0.3 * a + 0.25 * noise1(a * 1.5, i * 7 + j));
          const y = g.cy + bs.y - size * (0.3 + 0.8 * a);
          const r = size * (0.25 + 0.6 * q);
          const sg = ctx.createRadialGradient(x, y, 0, x, y, r);
          sg.addColorStop(0, `rgba(58, 52, 48, ${0.16 * Math.sin(Math.PI * q)})`);
          sg.addColorStop(1, 'rgba(58, 52, 48, 0)');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        }
      });
      // 炎：文字の中に散らした火元が、燃え際が届くと一気に燃え上がって文字を包み、燃え際が過ぎると小さくなって消える
      const flames = [];
      glyphs.forEach(([i, g]) => {
        for (let c = 0; c < 6; c++) {
          const seed = i * 17 + c * 5;
          const x = g.cx + bs.x + (rnd(seed, 1, 61) - 0.5) * g.size * 0.85;
          const y = g.cy + bs.y + g.size * (0.05 + 0.38 * rnd(seed, 2, 61));
          const a = t - ignite(x) - rnd(seed, 3, 61) * 0.06;
          if (a < 0) continue;
          const life = 0.35 + rnd(seed, 4, 61) * 0.25;
          const I = EASE.outCubic(clamp(a / 0.14)) * Math.exp(-Math.max(0, a - 0.14) / life) * tail;
          if (I < 0.03) continue;
          const h = size * (1.1 + 1.0 * rnd(seed, 5, 61)) * I * (0.8 + 0.2 * noise1(t * 7, seed));
          const w = size * (0.32 + 0.22 * rnd(seed, 6, 61)) * (0.55 + 0.45 * I);
          flames.push({ x, y, w, h, I, seed });
        }
      });
      flames.sort((p, q) => q.h - p.h);
      // 燃え際のまわりの熱の光
      const heat = clamp(bf.p / 0.05) * clamp((BLAZE_SWEEP + 0.1 - bf.p) / 0.15);
      ctx.globalCompositeOperation = 'lighter';
      if (heat > 0.01) {
        const mb = mainBox(layout, page);
        const hg = ctx.createRadialGradient(bf.x + bs.x, mb.cy + bs.y, 0, bf.x + bs.x, mb.cy + bs.y, size * 1.6);
        hg.addColorStop(0, colorWithAlpha(BLAZE.orange, 0.22 * heat));
        hg.addColorStop(1, colorWithAlpha(BLAZE.red, 0));
        ctx.fillStyle = hg;
        ctx.fillRect(bf.x + bs.x - size * 1.6, mb.cy + bs.y - size * 1.6, size * 3.2, size * 3.2);
      }
      ctx.globalCompositeOperation = 'source-over';
      flames.forEach(f => flameTongue(ctx, f.x, f.y, f.w, f.h, t, f.seed, BLAZE.red, BLAZE.deep, 0.6 * f.I));
      ctx.globalCompositeOperation = 'lighter';
      flames.forEach(f => flameTongue(ctx, f.x, f.y, f.w * 0.7, f.h * 0.75, t, f.seed, BLAZE.orange, BLAZE.red, 0.55 * f.I));
      flames.forEach(f => flameTongue(ctx, f.x, f.y + f.w * 0.1, f.w * 0.36, f.h * 0.42, t, f.seed, BLAZE.white, BLAZE.yellow, 0.5 * f.I));
      // 火の粉：燃えている文字から舞い上がり、うねりながら昇って、冷えるにつれて白 → 黄 → 橙 → 赤になって消える
      ctx.lineCap = 'round';
      glyphs.forEach(([i, g]) => {
        for (let j = 0; j < 10; j++) {
          const x0 = g.cx + bs.x + (rnd(i, j, 71) + rnd(i, j, 72) - 1) * g.size * 0.5;
          const y0 = g.cy + bs.y + (rnd(i, j, 73) + rnd(i, j, 74) - 1) * g.size * 0.5;
          const born = ignite(x0) + 0.05 + rnd(i, j, 75) * 0.35;
          const life = Math.min(0.8 + rnd(i, j, 76) * 0.9, end - born);
          const pos = a => [
            x0 + size * ((0.25 + 0.5 * rnd(i, j, 77)) * a + 0.3 * noise1(a * 2.5 + rnd(i, j, 78) * 9, i * 31 + j) * Math.min(1, a * 3)),
            y0 - size * 0.6 - size * (1.0 + 1.4 * rnd(i, j, 79)) * a * (1 - 0.2 * a)
          ];
          const a = t - born;
          if (a < 0 || a >= life || life <= 0.05) continue;
          const q = a / life;
          const [x, y] = pos(a);
          const [px, py] = pos(Math.max(0, a - 0.035));
          const col = q < 0.3 ? BLAZE.white : q < 0.6 ? BLAZE.yellow : q < 0.8 ? BLAZE.orange : BLAZE.red;
          const alpha = (0.7 + 0.3 * noise1(t * 20, i * 13 + j)) * (1 - q);
          const r = size * (0.008 + rnd(i, j, 80) * 0.01);
          ctx.fillStyle = colorWithAlpha(BLAZE.orange, 0.22 * alpha);
          ctx.beginPath(); ctx.arc(x, y, r * 4, 0, TAU); ctx.fill();
          ctx.strokeStyle = colorWithAlpha(col, alpha);
          ctx.lineWidth = r * 2;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        }
      });
      ctx.restore();
    }

    // 光の粒になって消える：ほどけ際が通ったところの文字から光の粒が生まれ、またたきながら右上へ漂って消える。
    // 粒の色は文字の光彩の色（光彩がなければ文字の色）
    drawFireflies(ctx, pg, page, t, scale, scene, bs) {
      const { layout } = this.prepared;
      const size = layout.size;
      const ff = fireflyFront(pg, page, t, size);
      if (!ff) return;
      const bo = pg.blockOut;
      const end = bo.start + bo.dur;
      const sweep = bo.dur * FIREFLY_SWEEP;
      const color = scene.glow && scene.glow.on ? scene.glow.color : (scene.fill && scene.fill.color) || '#fff3b0';
      const k = clamp(scene.outPower ?? 1, 0, 3);
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = page.first; i < page.last; i++) {
        const g = layout.glyphs[i];
        if (!g || g.blank) continue;
        const n = Math.max(3, Math.round(FIREFLY_PER_GLYPH * k));
        for (let j = 0; j < n; j++) {
          // 文字の中心寄りに散らばる生まれる位置。ほどけ際がそこを通った時刻に生まれる
          const ox = (rnd(i, j, 31) + rnd(i, j, 32) - 1) * g.size * 0.55;
          const oy = (rnd(i, j, 33) + rnd(i, j, 34) - 1) * g.size * 0.55;
          const x0 = g.cx + ox + bs.x, y0 = g.cy + oy + bs.y;
          const born = bo.start + sweep * clamp((x0 - ff.soft * 0.5 - ff.x0) / Math.max(1, ff.x1 - ff.x0)) + rnd(i, j, 35) * 0.12;
          const a = t - born;
          const life = Math.min(1.0 + rnd(i, j, 36) * 0.9, end - born);
          if (a < 0 || a >= life || life <= 0.05) continue;
          const q = a / life;
          const vx = size * (0.5 + rnd(i, j, 37) * 1.3);
          const vy = size * (0.12 + rnd(i, j, 38) * 0.4);
          const ph = rnd(i, j, 39) * TAU;
          const x = x0 + vx * a * (1 + 0.5 * a) + Math.sin(a * (2.2 + rnd(i, j, 40) * 2) + ph) * size * 0.06;
          const y = y0 - vy * a + Math.sin(a * (3 + rnd(i, j, 41) * 3) + ph * 2) * size * 0.08 * Math.min(1, a * 2);
          // 生まれた瞬間は明るく、そのあとはゆっくりまたたきながら薄れる
          const tw = 0.55 + 0.45 * Math.sin(a * (6 + rnd(i, j, 42) * 8) + ph);
          const alpha = clamp(a / 0.06) * (a < 0.15 ? 1 : tw) * (1 - q * q);
          if (alpha <= 0.01) continue;
          const r = size * (0.016 + rnd(i, j, 43) * 0.022) * (1 - 0.4 * q);
          ctx.fillStyle = colorWithAlpha(color, 0.12 * alpha);
          ctx.beginPath(); ctx.arc(x, y, r * 4.5, 0, TAU); ctx.fill();
          ctx.fillStyle = colorWithAlpha(color, 0.3 * alpha);
          ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fill();
          ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }

    drawSfx(ctx, pg, page, t, scale, scene, layer) {
      const sfx = sfxOf(scene);
      if (sfx.type === 'none' || sfx.type === 'fireWall') return;
      if (!SFX_BOTH.has(sfx.type) && (layer === 'back') !== SFX_BACK.has(sfx.type)) return;
      const { layout } = this.prepared;
      const mb = mainBox(layout, page);
      const k = clamp(sfx.power ?? 1, 0, 3);
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (sfx.type === 'lightning') this.drawLightning(ctx, pg, mb, t, scale, scene, sfx, k);
      else if (sfx.type === 'katana') this.drawKatana(ctx, pg, mb, t, scale, scene, sfx, k);
      else if (sfx.type === 'frame') this.drawFrame(ctx, pg, page, t, scale, scene, sfx, k);
      else if (sfx.type === 'crest') this.drawCrest(ctx, pg, page, t, scale, scene, sfx, k);
      else if (sfx.type === 'gunshot') this.drawGunshot(ctx, pg, page, t, scale, scene, sfx, k);
      else if (sfx.type === 'flame') this.drawFlame(ctx, pg, page, t, scale, scene, sfx, k, layer);
      else if (sfx.type === 'p5round') this.drawP5Round(ctx, pg, page, t, scale, scene, sfx, k);
      else if (sfx.type === 'p5round2') this.drawP5Round2(ctx, pg, page, t, scale, scene, sfx, k);
      else if (sfx.type === 'p5gun') this.drawP5Gun(ctx, pg, page, t, scale, scene, sfx, k);
      else if (sfx.type === 'blade') this.drawBlade(ctx, pg, page, t, scale, scene, sfx, k, layer);
      else if (sfx.type === 'shot') this.drawShot(ctx, pg, page, t, scale, scene, sfx, k, layer);
      else if (sfx.type === 'star') this.drawStar(ctx, pg, page, t, scale, scene, sfx, k, layer);
      else if (sfx.type === 'dream') this.drawDream(ctx, pg, page, t, scale, scene, sfx, k, layer);
      else if (sfx.type === 'vampire') this.drawVampire(ctx, pg, page, t, scale, scene, sfx, k, layer);
      else if (sfx.type === 'bulletMark') this.drawBulletMark(ctx, pg, page, t, scale, scene, sfx, k);
      else if (sfx.type === 'katanaFx') this.drawKatanaFx(ctx, pg, page, t, scale, scene, sfx, k);
      else if (sfx.type === 'zangekiHard') this.drawZangekiHard(ctx, pg, page, t, scale, scene, sfx, k);
      else if (sfx.type === 'clawMark') this.drawClawMark(ctx, pg, page, t, scale, scene, sfx, k);
      else if (sfx.type === 'fang' || sfx.type === 'fangFx') this.drawFang(ctx, pg, page, t, scale, scene, sfx, k, layer);
      else if (sfx.type.startsWith('fire')) this.drawFireFx(ctx, pg, page, t, scale, scene, sfx, k);
      ctx.restore();
      if (sfx.type === 'cyber') this.drawCyber(ctx, pg, page, t, scale, scene, sfx, k);
    }

    // 雷：左右から電気が横に走って中央でぶつかり、大きな火花 → 文字の上を電気が走る → もう一度落雷して消える
    drawLightning(ctx, pg, mb, t, scale, scene, sfx, k) {
      const color = sfx.color || '#8fd3ff';
      const size = this.prepared.layout.size;
      const W = scene.width, H = scene.height;
      const cx = mb.cx, cy = mb.cy;
      // 1) 画面の左右の端から中央へ、電気が横に走る
      const d0 = t - pg.start;
      if (d0 >= 0 && d0 < ARC_RUN + 0.06) {
        const e = EASE.inOutCubic(clamp(d0 / ARC_RUN)) * 0.6 + clamp(d0 / ARC_RUN) * 0.4;
        const frame = Math.floor(t * 30);
        [0, W].forEach((x0, si) => {
          const head = lerp(x0, cx, e);
          if (Math.abs(head - x0) < 1) return;
          const y0 = cy + (rnd(frame, si, 3) - 0.5) * size * 0.4;
          drawGlowPath(ctx, boltPoints(x0, y0, head, cy, frame * 5 + si, 6, 0.1), size * 0.042, color, 1, scale);
          const y1 = cy + (rnd(frame, si, 4) - 0.5) * size * 0.5;
          drawGlowPath(ctx, boltPoints(x0, y1, head, cy, frame * 5 + si + 50, 6, 0.14), size * 0.018, color, 0.8, scale);
          drawFlash(ctx, head, cy, size * 0.7, color, 0.7 * k);
        });
      }
      // 2) 中央で大きな火花：閃光・放射状の稲妻・飛び散る火の粉
      const d1 = t - (pg.start + ARC_RUN);
      if (d1 >= 0 && d1 < SPARK_DUR) {
        const q = d1 / SPARK_DUR;
        const grow = 0.5 + 0.5 * EASE.outCubic(clamp(d1 / 0.15));
        drawFlash(ctx, cx, cy, Math.max(W, H) * 0.7 * grow, color, 0.95 * k * Math.pow(1 - q, 2));
        if (d1 < 0.34 && (d1 < 0.1 || d1 > 0.13)) {
          const rays = 9;
          const flick = Math.floor(d1 * 30);
          for (let i = 0; i < rays; i++) {
            const ang = (i / rays) * TAU + (rnd(i, 7, 77) - 0.5) * 0.5;
            const len = size * (2 + rnd(i, 8, 77) * 2.4) * Math.min(1.6, k);
            boltWithBranches(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len * 0.75, 900 + i + flick * 13).forEach(path => {
              drawGlowPath(ctx, path.pts, size * 0.034 * path.w, color, 1 - d1 / 0.34, scale);
            });
          }
        }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = size * 0.1 * scale;
        ctx.strokeStyle = '#ffffff';
        const n = Math.round(SPARK_COUNT * Math.min(1.5, k));
        for (let i = 0; i < n; i++) {
          const life = SPARK_DUR * (0.45 + 0.55 * rnd(i, 1, 55));
          if (d1 > life) continue;
          const ang = rnd(i, 2, 55) * TAU;
          const v = size * (4 + rnd(i, 3, 55) * 10);
          const travel = (1 - Math.exp(-d1 * 5)) / 5;
          const px = cx + Math.cos(ang) * v * travel;
          const py = cy + Math.sin(ang) * v * travel + size * 1.5 * d1 * d1;
          const tl = Math.max(size * 0.06, v * Math.exp(-d1 * 5) * 0.05);
          const fade = 1 - d1 / life;
          ctx.globalAlpha = fade;
          ctx.lineWidth = size * 0.03 * (0.5 + 0.7 * fade);
          ctx.beginPath();
          ctx.moveTo(px - Math.cos(ang) * tl, py - Math.sin(ang) * tl);
          ctx.lineTo(px, py);
          ctx.stroke();
        }
        ctx.restore();
      }
      // 3) 退場の直前にもう一度落雷
      const d2 = t - pg.holdEnd;
      if (scene.outEnabled !== false && Number.isFinite(pg.holdEnd) && d2 >= 0 && d2 <= STRIKE_DUR) {
        const seed = 23 + pg.index;
        const fade = 1 - d2 / STRIKE_DUR;
        drawFlash(ctx, cx, cy, Math.max(W, H) * 0.65, color, 0.55 * k * fade * fade);
        if (d2 < 0.07 || (d2 > 0.12 && d2 < 0.2) || (d2 > 0.26 && d2 < 0.33)) {
          for (let b = 0; b < 2; b++) {
            const sx = cx + (rnd(seed, b, 1) - 0.5) * W * 0.5;
            const ex = cx + (rnd(seed, b, 2) - 0.5) * (mb.x1 - mb.x0) * 0.6;
            const ey = cy + (rnd(seed, b, 3) - 0.5) * (mb.y1 - mb.y0) * 0.4;
            boltWithBranches(sx, -H * 0.05, ex, ey, seed * 7 + b).forEach(path => {
              drawGlowPath(ctx, path.pts, size * 0.05 * path.w * (b ? 0.7 : 1), color, fade * (b ? 0.8 : 1), scale);
            });
          }
        }
      }
      // 表示中：文字の上を電気が走る（脈打つように強弱）
      if (t >= pg.inEnd - 0.15 && t < pg.holdEnd && mb.list.length) {
        const frame = Math.floor(t * 15);
        const pulse = 0.55 + 0.45 * Math.sin(TAU * (t - pg.inEnd) / 0.8);
        const n = 2 + Math.floor(rnd(frame, 1, 41) * 3 * Math.min(1.5, k));
        for (let i = 0; i < n; i++) {
          if (rnd(frame, 10 + i, 41) < 0.15) continue;
          const gi = Math.floor(rnd(frame, 20 + i, 41) * mb.list.length);
          const a = mb.list[gi];
          const b = mb.list[Math.min(mb.list.length - 1, gi + 1)] || a;
          const r = a.size * 0.45;
          const x0 = a.cx + (rnd(frame, 30 + i, 41) - 0.5) * r * 2, y0 = a.cy + (rnd(frame, 40 + i, 41) - 0.5) * r * 2;
          let x1 = b.cx + (rnd(frame, 50 + i, 41) - 0.5) * r * 2, y1 = b.cy + (rnd(frame, 60 + i, 41) - 0.5) * r * 2;
          // ときどき文字の外へ火花が飛ぶ
          if (a === b || rnd(frame, 70 + i, 41) < 0.25) {
            const ang = rnd(frame, 80 + i, 41) * TAU;
            x1 = x0 + Math.cos(ang) * a.size * 0.9;
            y1 = y0 + Math.sin(ang) * a.size * 0.9;
          }
          const pts = boltPoints(x0, y0, x1, y1, frame * 13 + i, 5, 0.32);
          const w = size * 0.016 * (0.75 + 0.5 * pulse), al = clamp(pulse * k);
          drawGlowPath(ctx, pts, w, color, al, scale, 0.5);
          // 途中から短く枝分かれする
          const m = pts[Math.floor(pts.length * (0.3 + 0.4 * rnd(frame, 90 + i, 41)))];
          const fa = Math.atan2(y1 - y0, x1 - x0) + (rnd(frame, 95 + i, 41) < 0.5 ? -1 : 1) * (0.5 + 0.5 * rnd(frame, 96 + i, 41));
          const fl = Math.hypot(x1 - x0, y1 - y0) * 0.35;
          drawGlowPath(ctx, boltPoints(m[0], m[1], m[0] + Math.cos(fa) * fl, m[1] + Math.sin(fa) * fl, frame * 17 + i, 4, 0.3), w * 0.55, color, al * 0.8, scale, 0.8);
          drawFlash(ctx, x1, y1, a.size * 0.35, color, 0.35 * al);
        }
      }
    }

    // 刀：そのまま出ていた文字の上を、退場の始めに一閃が横切って閃光 → 切り口が光って文字が切れる
    // （退場「斬られて左右へ」と組み合わせると、そのあと上下がずれて消える）
    drawKatana(ctx, pg, mb, t, scale, scene, sfx, k) {
      if (!Number.isFinite(pg.holdEnd)) return;
      const color = sfx.color || '#cfe6ff';
      const size = this.prepared.layout.size;
      const W = scene.width;
      const y = mb.cy;
      const blade = (x0, x1, th, alpha) => {
        if (alpha <= 0.002 || x1 - x0 <= 0.5 || th <= 0.05) return;
        ctx.save();
        ctx.globalAlpha = clamp(alpha);
        ctx.shadowColor = color;
        ctx.shadowBlur = th * 8 * scale;
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, colorWithAlpha(color, 0));
        g.addColorStop(0.55, colorWithAlpha('#ffffff', 0.85));
        g.addColorStop(1, '#ffffff');
        ctx.fillStyle = g;
        const neck = x1 - (x1 - x0) * 0.15;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.quadraticCurveTo(neck, y - th, x1, y);
        ctx.quadraticCurveTo(neck, y + th, x0, y);
        ctx.fill();
        ctx.restore();
      };
      const cut = katanaCut(pg);
      const d = t - (cut - SLASH_SWEEP);
      if (d >= 0 && d < SLASH_DUR) {
        const th = size * 0.1 * k;
        if (d < SLASH_SWEEP) {
          const head = W * 1.05 * EASE.outCubic(d / SLASH_SWEEP);
          blade(Math.max(0, head - W * 0.75), head, th, 1);
        } else {
          const q = (d - SLASH_SWEEP) / (SLASH_DUR - SLASH_SWEEP);
          blade(0, W, th * (1 - q), 1 - q * q);
          // 一閃の芯：細い白線が少し長く残る
          blade(0, W, size * 0.012, 1 - q);
        }
        const f = (d - 0.08) / (SLASH_DUR - 0.08);
        if (f >= 0) drawFlash(ctx, mb.cx, y, W * 0.6, color, 0.85 * k * Math.pow(1 - f, 2), 0.22);
      }
      // 切れた瞬間：切り口に沿って細い光
      const g = t - cut;
      if (g >= 0 && g < CUT_GLINT) blade(mb.x0 - size * 0.4, mb.x1 + size * 0.4, size * 0.018 * k, 1 - g / CUT_GLINT);
    }

    // サイバー：画面が少し暗くなり走査線が流れ、四隅に照準の角、中央に回る目盛りの輪・警告マーク・左右の表示・「WARNING」が組み上がって点滅 →
    // マークが横一本の線につぶれ、その線が暗い帯に開いて文字がグリッチで出る →
    // 表示中は帯の上下に小さな「WARNING //」が流れ、ときどき短いノイズ → 退場で帯が線に閉じてグリッチで消える。
    // 色は警告色と暗い帯と白だけ。すべて文字の後ろに描く
    drawCyber(ctx, pg, page, t, scale, scene, sfx, k) {
      const tail = SFX_TIMING.cyber.tail;
      const d = t - pg.start;
      if (d < 0) return;
      const outEnd = pg.outEnd;
      if (Number.isFinite(outEnd) && t > outEnd + tail) return;
      const seed = 61 + pg.index;
      const frame = Math.floor(t * 24);
      const W = scene.width, H = scene.height;
      const size = this.prepared.layout.size;
      const color = sfx.color || '#ff2b4a';
      const dark = sfx.color2 || '#14040a';
      const word = String(sfx.word ?? 'WARNING').trim() || 'WARNING';
      const mb = mainBox(this.prepared.layout, page);
      const b = page.box;
      const cx = (b.x0 + b.x1) / 2, cy = mb.cy;
      const bandT = b.y0 - size * 0.3, bandB = b.y1 + size * 0.3;
      const bw = Math.min((b.x1 - b.x0) / 2 + size * 1.6, Math.max(W / 2, (b.x1 - b.x0) / 2 + size * 0.5));
      const lw = size * 0.02;
      const fam = fontFamiliesFor(scene, 1, this.resolveFont);
      const lctx = this.lctx;
      const cw = this.layer.width, ch = this.layer.height;
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'source-over';
      lctx.globalAlpha = 1;
      lctx.filter = 'none';
      lctx.clearRect(0, 0, cw, ch);
      lctx.setTransform(scale, 0, 0, scale, 0, 0);
      lctx.textBaseline = 'middle';
      lctx.textAlign = 'center';
      const spaced = px => { if ('letterSpacing' in lctx) lctx.letterSpacing = `${px}px`; };
      let glitch = 0;

      // 退場：帯が線に閉じながら、ちらついて消える
      let fade = 1, close = 0;
      if (Number.isFinite(outEnd) && t > pg.holdEnd) {
        const q = clamp((t - pg.holdEnd) / Math.max(0.05, outEnd + tail - pg.holdEnd));
        close = EASE.inCubic(q);
        fade = 1 - q * q;
        glitch = Math.max(glitch, 0.25 + 0.75 * q);
        if (rnd(frame, 2, seed) < q * 0.6) fade *= 0.15;
      }
      const a0 = clamp(k, 0, 1) * fade;

      // 1) 画面を少し暗くする（予兆のあいだだけ）
      const settle = d - CYBER_ALERT;
      const dim = EASE.outCubic(clamp(d / 0.15)) * (1 - EASE.inOutCubic(clamp((settle - 0.05) / 0.35)));
      if (dim > 0.002) {
        lctx.fillStyle = colorWithAlpha(dark, 0.5 * dim * clamp(k, 0, 1));
        lctx.fillRect(0, 0, W, H);
      }

      // 2) 四隅の照準の角：外から寄ってきて止まり、表示中は控えめに残る
      {
        const m = Math.min(W, H) * 0.06, arm = Math.min(W, H) * 0.07;
        const off = (1 - EASE.outCubic(clamp(d / 0.22))) * m * 1.5;
        const a = a0 * clamp(d / 0.08) * (settle > 0.3 ? 0.55 : 1) * (d < 0.2 && rnd(frame, 6, seed) < 0.35 ? 0.2 : 1);
        if (a > 0.002) {
          lctx.save();
          lctx.globalAlpha = a;
          lctx.strokeStyle = color;
          lctx.lineWidth = lw * 1.2;
          lctx.lineCap = 'butt';
          lctx.beginPath();
          [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => {
            const x = (sx > 0 ? m : W - m) - sx * off, y = (sy > 0 ? m : H - m) - sy * off;
            lctx.moveTo(x, y + sy * arm); lctx.lineTo(x, y); lctx.lineTo(x + sx * arm, y);
          });
          lctx.stroke();
          lctx.restore();
        }
      }

      // 3) 中央の照準（回る目盛りの輪・警告マーク・左右の表示・大きな「WARNING」）が起動するように組み上がり、
      //    点滅したあと、横一本の線につぶれる。そのあいだ走査線が画面を上から下へ1回なでる
      if (settle < 0.14) {
        const sy = 1 - EASE.inCubic(clamp(settle / 0.12));
        if (d < 0.1) glitch = Math.max(glitch, 0.5);
        if (Math.abs(d - 0.5) < 0.04) glitch = Math.max(glitch, 0.45);
        if (settle > -0.02) glitch = Math.max(glitch, 0.7);
        const on = d < 0.08 ? rnd(frame, 1, seed) < 0.5 : !(d > 0.5 && d < 0.56);
        // 走査線：細いすじを全面に、明るい1本が上から下へ
        if (dim > 0.002) {
          lctx.save();
          lctx.globalAlpha = 0.07 * dim * a0;
          lctx.fillStyle = color;
          const gap = Math.max(3, H / 180);
          for (let y = 0; y < H; y += gap) lctx.fillRect(0, y, W, gap * 0.35);
          const sweep = clamp(d / (CYBER_ALERT * 0.8));
          if (sweep < 1) {
            const sy0 = H * EASE.inOutCubic(sweep), sh = size * 0.6;
            const g = lctx.createLinearGradient(0, sy0 - sh, 0, sy0);
            g.addColorStop(0, colorWithAlpha(color, 0));
            g.addColorStop(1, colorWithAlpha(color, 0.3));
            lctx.globalAlpha = a0;
            lctx.fillStyle = g;
            lctx.fillRect(0, sy0 - sh, W, sh);
            lctx.fillStyle = colorWithAlpha(color, 0.9);
            lctx.fillRect(0, sy0 - lw * 0.5, W, lw * 0.5);
          }
          lctx.restore();
        }
        if (on && sy > 0.01) {
          const R = size * 1.3;
          const ox = W / 2, oy = cy - size * 0.2;
          const boot = u => EASE.outCubic(clamp((d - u) / 0.18));
          lctx.save();
          lctx.globalAlpha = a0;
          lctx.translate(ox, cy);
          lctx.scale(1, sy);
          lctx.translate(-ox, -cy);
          lctx.strokeStyle = color;
          lctx.fillStyle = color;
          lctx.shadowColor = color;
          lctx.shadowBlur = size * 0.08 * scale;
          lctx.lineCap = 'butt';
          // 外側：12個の目盛りが順に点いて、ゆっくり回る
          const rot = d * 0.9;
          lctx.lineWidth = lw * 1.3;
          for (let i = 0; i < 12; i++) {
            if (d < 0.04 + i * 0.018) continue;
            const a = rot + i / 12 * TAU;
            lctx.beginPath(); lctx.arc(ox, oy, R, a, a + TAU / 12 * 0.62); lctx.stroke();
          }
          // 内側の細い輪と、上下左右の目盛り
          const ib = boot(0.08);
          if (ib > 0) {
            lctx.lineWidth = lw * 0.6;
            lctx.globalAlpha = a0 * 0.6;
            lctx.beginPath(); lctx.arc(ox, oy, R * 0.8, -Math.PI / 2, -Math.PI / 2 + TAU * ib); lctx.stroke();
            lctx.globalAlpha = a0;
            lctx.lineWidth = lw;
            lctx.beginPath();
            for (let i = 0; i < 4; i++) {
              const a = i / 4 * TAU;
              lctx.moveTo(ox + Math.cos(a) * R * 0.8, oy + Math.sin(a) * R * 0.8);
              lctx.lineTo(ox + Math.cos(a) * R * (0.8 - 0.12 * ib), oy + Math.sin(a) * R * (0.8 - 0.12 * ib));
            }
            lctx.stroke();
          }
          // 逆向きに速く回る、太い短い弧が2本
          const sb = boot(0.14);
          if (sb > 0) {
            lctx.lineWidth = lw * 2.6;
            const a = -d * 3.2;
            [0, Math.PI].forEach(o => { lctx.beginPath(); lctx.arc(ox, oy, R * 1.13, a + o, a + o + 0.7 * sb); lctx.stroke(); });
          }
          // 警告マーク：二重線の三角と「！」
          const tb = boot(0.18);
          if (tb > 0) {
            const S = R * 0.95 * (0.8 + 0.2 * tb), th = S * 0.87;
            const tri = (sc) => {
              lctx.beginPath();
              lctx.moveTo(ox, oy - th / 2 * sc + th * 0.06);
              lctx.lineTo(ox + S / 2 * sc, oy + th / 2 * sc + th * 0.06);
              lctx.lineTo(ox - S / 2 * sc, oy + th / 2 * sc + th * 0.06);
              lctx.closePath();
            };
            lctx.globalAlpha = a0 * tb;
            lctx.lineJoin = 'miter';
            tri(1); lctx.fillStyle = colorWithAlpha(color, 0.14); lctx.fill();
            lctx.lineWidth = lw * 1.6; lctx.stroke();
            lctx.lineWidth = lw * 0.5; tri(0.8); lctx.stroke();
            lctx.fillStyle = color;
            const ew = lw * 2;
            lctx.fillRect(ox - ew / 2, oy - th * 0.08, ew, th * 0.3);
            lctx.fillRect(ox - ew / 2, oy + th * 0.28, ew, ew);
          }
          lctx.shadowBlur = 0;
          // 左右の表示：引き出し線と、1文字ずつ打ち出される小さな文字
          const fs = size * 0.13;
          lctx.font = fontString(fam, scene.subWeight || 400, fs, false);
          spaced(fs * 0.2);
          const lines = [
            [-1, ['SYS//ALERT', 'CODE 0xE7', `LV.0${1 + Math.floor(rnd(seed, 3, 1) * 8)}`]],
            [1, ['HOSTILE', 'DETECTED', '']]
          ];
          lines.forEach(([side, rows], si) => {
            const lb = boot(0.2 + si * 0.06);
            if (lb <= 0) return;
            const x0 = ox + side * R * 1.25, x1 = x0 + side * size * 0.5 * lb;
            lctx.globalAlpha = a0;
            lctx.fillRect(Math.min(x0, x1), oy - size * 0.32 - lw * 0.3, Math.abs(x1 - x0), lw * 0.6);
            lctx.textAlign = side < 0 ? 'right' : 'left';
            rows.forEach((txt, ri) => {
              const shown = Math.floor(clamp((d - 0.26 - si * 0.06 - ri * 0.07) / 0.18) * txt.length);
              const y = oy - size * 0.16 + ri * fs * 1.5;
              lctx.globalAlpha = a0 * (ri === 0 ? 1 : 0.7);
              if (shown > 0) lctx.fillText(txt.slice(0, shown), x1, y);
            });
            // 右側の3行目は、満ちていくゲージ
            if (side > 0) {
              const gp = clamp((d - 0.34) / 0.3);
              const n = 8, cwid = fs * 0.55, gy = oy - size * 0.16 + 2 * fs * 1.5 - fs * 0.35;
              for (let i = 0; i < n; i++) {
                lctx.globalAlpha = a0 * (i < Math.round(gp * n) ? 1 : 0.25);
                lctx.fillRect(x1 + i * cwid * 1.35, gy, cwid, fs * 0.7);
              }
            }
          });
          spaced(0);
          // 下に大きく「WARNING」：角かっこで挟む
          const wb = boot(0.24);
          if (wb > 0) {
            const wfs = size * 0.36, wy = oy + R * 1.13 + size * 0.42;
            lctx.globalAlpha = a0 * wb;
            lctx.font = fontString(fontFamiliesFor(scene, 0, this.resolveFont), scene.weight || 700, wfs, false);
            spaced(wfs * 0.45);
            lctx.textAlign = 'center';
            lctx.shadowColor = color;
            lctx.shadowBlur = size * 0.1 * scale;
            lctx.fillText(word, ox + wfs * 0.22, wy);
            const tw = lctx.measureText(word).width;
            spaced(0);
            lctx.shadowBlur = 0;
            const bx = tw / 2 + size * 0.3, bh = wfs * 0.75, arm = size * 0.12;
            lctx.lineWidth = lw;
            lctx.beginPath();
            [-1, 1].forEach(s => {
              const x = ox + s * bx * (0.7 + 0.3 * wb);
              lctx.moveTo(x - s * arm, wy - bh); lctx.lineTo(x, wy - bh); lctx.lineTo(x, wy + bh); lctx.lineTo(x - s * arm, wy + bh);
            });
            lctx.stroke();
          }
          lctx.restore();
          lctx.textAlign = 'center';
        }
      }

      // 4) 帯：つぶれた線が横に伸びて光り、上下に開いて暗い帯になる
      if (settle >= 0) {
        const wOpen = EASE.outExpo(clamp(settle / 0.25));
        const hOpen = EASE.outCubic(clamp((settle - 0.08) / 0.3)) * (1 - close);
        const w = bw * wOpen;
        const top = lerp(cy, bandT, hOpen), bot = lerp(cy, bandB, hOpen);
        const ramp = (x0, x1, col, alpha) => {
          const g = lctx.createLinearGradient(x0, 0, x1, 0);
          g.addColorStop(0, colorWithAlpha(col, 0));
          g.addColorStop(0.3, colorWithAlpha(col, alpha));
          g.addColorStop(0.7, colorWithAlpha(col, alpha));
          g.addColorStop(1, colorWithAlpha(col, 0));
          return g;
        };
        if (a0 > 0.002 && w > 1) {
          lctx.globalAlpha = a0;
          lctx.fillStyle = ramp(cx - w, cx + w, dark, 0.88);
          lctx.fillRect(cx - w, top, w * 2, bot - top);
          // 線が伸びた瞬間だけ白く光る
          const hot = 1 - clamp(settle / 0.3);
          [[color, 1], ['#ffffff', hot]].forEach(([col, al]) => {
            if (al <= 0) return;
            lctx.fillStyle = ramp(cx - w * 1.12, cx + w * 1.12, col, al);
            lctx.fillRect(cx - w * 1.12, top - lw, w * 2.24, lw);
            lctx.fillRect(cx - w * 1.12, bot, w * 2.24, lw);
          });
          // 帯の角に短い太い線（左上と右下）
          const tab = size * 0.45 * EASE.outCubic(clamp((settle - 0.2) / 0.25));
          if (tab > 0.5) {
            lctx.fillStyle = color;
            lctx.fillRect(cx - w * 0.62, top - lw * 2.5, tab, lw * 2.5);
            lctx.fillRect(cx + w * 0.62 - tab, bot, tab, lw * 2.5);
          }
          // 5) 帯の上下に小さな「WARNING //」が逆向きに流れる。端は帯と同じように薄れる
          const ta = EASE.outCubic(clamp((settle - 0.3) / 0.3)) * (1 - close);
          if (ta > 0.002) {
            const fs = size * 0.15;
            lctx.font = fontString(fam, 400, fs, false);
            spaced(fs * 0.35);
            lctx.textAlign = 'left';
            const unit = `${word}  //  `;
            const uw = Math.max(1, lctx.measureText(unit).width);
            const rows = [[top - lw - size * 0.15, -1], [bot + lw + size * 0.15, 1]];
            lctx.save();
            lctx.globalAlpha = a0 * ta * 0.8;
            lctx.fillStyle = color;
            rows.forEach(([y, dir]) => {
              lctx.save();
              lctx.beginPath(); lctx.rect(cx - w, y - fs, w * 2, fs * 2); lctx.clip();
              let x = cx - w - ((d * size * 0.7) % uw);
              if (dir > 0) x = cx - w - uw + ((d * size * 0.7) % uw);
              for (; x < cx + w; x += uw) lctx.fillText(unit, x, y);
              // 端を薄くする
              lctx.globalCompositeOperation = 'destination-in';
              lctx.globalAlpha = 1;
              lctx.fillStyle = ramp(cx - w, cx + w, '#ffffff', 1);
              lctx.fillRect(cx - w, y - fs, w * 2, fs * 2);
              lctx.restore();
            });
            lctx.restore();
            spaced(0);
            lctx.textAlign = 'center';
          }
          lctx.globalAlpha = 1;
        }
        // 表示中ときどき短いノイズ
        if (t < pg.holdEnd && settle > 0.6 && (settle - 0.6) % CYBER_BURST < 0.1) glitch = Math.max(glitch, 0.35);
      }

      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalAlpha = 1;
      if (glitch > 0.01) this.applyGlitch(glitch * Math.max(0.5, k), t, { x: 0, y: 0, w: cw, h: ch }, size * scale, 7 + pg.index, scene);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.layer, 0, 0);
      ctx.restore();
    }

    // 装飾枠：四隅の飾りが現れ、二重線が角から辺の中央へ伸びて、上下左右の飾りが開く。
    // 表示中は光が枠をなぞり、退場では線が角へ戻っていく
    drawFrame(ctx, pg, page, t, scale, scene, sfx, k) {
      const d = t - pg.start;
      if (d < 0) return;
      const size = this.prepared.layout.size;
      const color = sfx.color || '#e2bd6b';
      const inner = sfx.color2 || '#fff1cf';
      const b = page.box;
      const x0 = b.x0 - size * 0.75, x1 = b.x1 + size * 0.75;
      const y0 = b.y0 - size * 0.42, y1 = b.y1 + size * 0.42;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const out = outProgress(pg, t);
      const draw = EASE.inOutCubic(clamp((d - 0.1) / FRAME_DRAW)) * (1 - EASE.inCubic(out));
      const cs = EASE.outBack(clamp(d / 0.25)) * (1 - EASE.inCubic(clamp((out - 0.5) / 0.5)));
      const os = EASE.outBack(clamp((d - 0.1 - FRAME_DRAW * 0.8) / 0.3)) * (1 - EASE.inCubic(clamp(out / 0.5)));
      ctx.globalAlpha = clamp(k);
      ctx.lineCap = 'square';
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.1 * scale;
      const lines = (inset, lw, col) => {
        const ax0 = x0 + inset, ax1 = x1 - inset, ay0 = y0 + inset, ay1 = y1 - inset;
        const hw = (ax1 - ax0) / 2 * draw, hh = (ay1 - ay0) / 2 * draw;
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(ax0, ay0); ctx.lineTo(ax0 + hw, ay0);
        ctx.moveTo(ax1, ay0); ctx.lineTo(ax1 - hw, ay0);
        ctx.moveTo(ax0, ay1); ctx.lineTo(ax0 + hw, ay1);
        ctx.moveTo(ax1, ay1); ctx.lineTo(ax1 - hw, ay1);
        ctx.moveTo(ax0, ay0); ctx.lineTo(ax0, ay0 + hh);
        ctx.moveTo(ax0, ay1); ctx.lineTo(ax0, ay1 - hh);
        ctx.moveTo(ax1, ay0); ctx.lineTo(ax1, ay0 + hh);
        ctx.moveTo(ax1, ay1); ctx.lineTo(ax1, ay1 - hh);
        ctx.stroke();
      };
      if (draw > 0.001) {
        lines(0, size * 0.035, color);
        lines(size * 0.11, size * 0.012, inner);
      }
      // 四隅：外側に L 字の飾りとひし形
      if (cs > 0.01) {
        [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([px, py, sx, sy]) => {
          ctx.save();
          ctx.translate(px, py);
          ctx.scale(sx * cs, sy * cs);
          const o = size * 0.1, L = size * 0.45;
          ctx.strokeStyle = color;
          ctx.lineWidth = size * 0.045;
          ctx.beginPath(); ctx.moveTo(-o, L - o); ctx.lineTo(-o, -o); ctx.lineTo(L - o, -o); ctx.stroke();
          diamond(ctx, -o, -o, size * 0.1, color);
          diamond(ctx, size * 0.12, size * 0.12, size * 0.04, inner);
          ctx.restore();
        });
      }
      // 上下の中央にひし形、左右には外へ伸びる飾り線
      if (os > 0.01) {
        [y0, y1].forEach(py => {
          diamond(ctx, cx, py, size * 0.13 * os, color);
          diamond(ctx, cx, py, size * 0.055 * os, inner);
          diamond(ctx, cx - size * 0.32 * os, py, size * 0.045 * os, color);
          diamond(ctx, cx + size * 0.32 * os, py, size * 0.045 * os, color);
        });
        [[x0, -1], [x1, 1]].forEach(([px, dir]) => {
          const len = size * 1.1 * os;
          const sx = px + dir * size * 0.14;
          const g = ctx.createLinearGradient(sx, 0, sx + dir * len, 0);
          g.addColorStop(0, color);
          g.addColorStop(1, colorWithAlpha(color, 0));
          ctx.strokeStyle = g;
          ctx.lineWidth = size * 0.025;
          ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx + dir * len, cy); ctx.stroke();
          diamond(ctx, px, cy, size * 0.09 * os, color);
          diamond(ctx, sx + dir * len * 0.3, cy, size * 0.045 * os, inner);
        });
      }
      // 表示中：光が枠をなぞる（向かい合う2点）
      if (draw >= 0.999 && t >= pg.inEnd && t < pg.holdEnd) {
        const w = x1 - x0, h = y1 - y0, per = 2 * (w + h);
        const pos = u => {
          let s2 = ((u % 1) + 1) % 1 * per;
          if (s2 < w) return [x0 + s2, y0];
          s2 -= w;
          if (s2 < h) return [x1, y0 + s2];
          s2 -= h;
          if (s2 < w) return [x1 - s2, y1];
          return [x0, y1 - (s2 - w)];
        };
        const u = (t - pg.inEnd) / 2.4;
        const a = clamp((t - pg.inEnd) / 0.3) * clamp((pg.holdEnd - t) / 0.3);
        [u, u + 0.5].forEach(v => {
          const [gx, gy] = pos(v);
          drawFlash(ctx, gx, gy, size * 0.4, inner, 0.9 * a * k);
          twinkle(ctx, gx, gy, size * 0.22, '#ffffff', a);
        });
      }
    }

    // 剣と盾：金の細い線だけで描く紋章を、文字の帯の上に置く。2本の剣が刃の向きに飛び込んで交差し、きらめく →
    // 盾の輪郭が上から先端まで線で引かれ、先端から金の細線が左右へ走って暗い帯が開き、文字。
    // 表示中は光が盾の縁を下って細線へ流れ、退場では全体が少し大きくなりながら消える
    drawCrest(ctx, pg, page, t, scale, scene, sfx, k) {
      const d = t - pg.start;
      if (d < 0) return;
      const size = this.prepared.layout.size;
      const gold = sfx.color || '#d8b46a';
      const dark = sfx.color2 || '#0b0e16';
      const b = page.box;
      const em = crestScale(k);
      const SH = size * 1.5 * em, SW = SH * 0.8, L = size * 3.4 * em;
      const lw = size * 0.022;
      const bandT = b.y0 - size * 0.3, bandB = b.y1 + size * 0.3;
      // 盾の中心（剣の柄頭が帯にかからない高さ）と剣の交点
      const ey = bandT - size * CREST_GAP - Math.max(SH * 0.5, L * CREST_POMMEL - size * 0.1 * em);
      const sy = ey - size * 0.1 * em;
      const tipY = ey + SH * 0.5;
      const out = outProgress(pg, t);
      const midY = (ey - SH * 0.5 + bandB) / 2;
      ctx.globalAlpha = 1 - EASE.inQuad(out);
      ctx.translate((b.x0 + b.x1) / 2, midY);
      ctx.scale(1 + out * 0.05, 1 + out * 0.05);
      ctx.translate(0, -midY);
      // 1) 帯：盾の先端から金の細線が左右へ走り、暗い帯が開く（紋章の後ろ）
      const be = EASE.outExpo(clamp((d - CREST_BAND_AT) / CREST_BAND));
      // 帯の端は画像の端までに薄れきるように（長い文字では文字の端が薄い部分にかかる）
      const textHalf = (b.x1 - b.x0) / 2;
      const bw = Math.min(textHalf + size * 1.6, Math.max(scene.width / 2, textHalf + size * 0.5));
      const lineW = bw * 1.15;
      const fade = (w, color, alpha) => {
        const g = ctx.createLinearGradient(-w, 0, w, 0);
        g.addColorStop(0, colorWithAlpha(color, 0));
        g.addColorStop(0.3, colorWithAlpha(color, alpha));
        g.addColorStop(0.7, colorWithAlpha(color, alpha));
        g.addColorStop(1, colorWithAlpha(color, 0));
        return g;
      };
      // 盾の先端から帯まで細い線を下ろし、帯の上の線の中央に小さなひし形
      const drop = EASE.outCubic(clamp((d - CREST_BAND_AT + 0.12) / 0.14));
      if (drop > 0) {
        ctx.fillStyle = gold;
        ctx.fillRect(-lw * 0.4, tipY, lw * 0.8, (bandT - tipY) * drop);
      }
      if (be > 0) {
        const w = bw * be, lw2 = lineW * be;
        ctx.fillStyle = fade(w, dark, 0.88 * EASE.outCubic(clamp((d - CREST_BAND_AT) / (CREST_BAND * 0.7))));
        ctx.fillRect(-w, bandT, w * 2, bandB - bandT);
        ctx.fillStyle = fade(lw2, gold, 1);
        ctx.fillRect(-lw2, bandT - lw, lw2 * 2, lw);
        ctx.fillRect(-lw2, bandB, lw2 * 2, lw);
        diamond(ctx, 0, bandT - lw * 0.5, size * 0.075 * EASE.outBack(clamp((d - CREST_BAND_AT) / 0.2)), gold);
      }
      const half = shieldHalf(SW, SH), halfL = mirrorX(half);
      const s0 = CREST_SWORDS * 0.8;
      const fillA = clamp((d - s0) / (CREST_SHIELD * 0.8));
      // 2) 剣：柄の方向から刃の向きに沿って飛び込み、交差したところで止まる（飛び込む間は刃の向きに光の筋）。
      // 盾が塗り終わったら盾の内側には描かない（退場で薄くなっても盾越しに見えないように）
      ctx.save();
      if (fillA >= 1) {
        ctx.beginPath();
        ctx.rect(-scene.width * 2, -scene.height * 2, scene.width * 4, scene.height * 4);
        ctx.moveTo(half[0][0], ey + half[0][1]);
        half.forEach(([x, y]) => ctx.lineTo(x, ey + y));
        for (let i = halfL.length - 1; i >= 0; i--) ctx.lineTo(halfL[i][0], ey + halfL[i][1]);
        ctx.closePath();
        ctx.clip('evenodd');
      }
      ctx.translate(0, sy);
      const se = EASE.outExpo(clamp(d / CREST_SWORDS));
      [Math.PI / 4, -Math.PI / 4].forEach(rot => {
        ctx.save();
        ctx.rotate(rot);
        const q = d / (CREST_SWORDS * 0.6);
        if (q < 1) {
          const g = ctx.createLinearGradient(0, L * 0.6, 0, -L * 0.5);
          g.addColorStop(0, colorWithAlpha(gold, 0));
          g.addColorStop(1, colorWithAlpha(gold, 0.6 * (1 - q)));
          ctx.fillStyle = g;
          ctx.fillRect(-lw * 0.5, -L * 0.5, lw, L * 1.1);
        }
        ctx.translate(0, L * 0.9 * (1 - se));
        ctx.globalAlpha *= clamp(d / 0.08);
        drawSwordLine(ctx, L, gold, null, lw);
        ctx.restore();
      });
      ctx.restore();
      // 3) 盾：上辺の中央から左右の縁を下へ線で引き、内側の線が続く。中は暗く塗って剣の中ほどを隠し、中央にひし形
      ctx.save();
      ctx.translate(0, ey);
      const draw = EASE.inOutCubic(clamp((d - s0) / CREST_SHIELD));
      const draw2 = EASE.inOutCubic(clamp((d - s0 - 0.1) / CREST_SHIELD));
      if (fillA > 0) {
        ctx.save();
        ctx.globalAlpha *= fillA;
        ctx.fillStyle = dark;
        ctx.beginPath();
        polyPartial(ctx, half, 0, 1);
        ctx.lineTo(0, half[0][1]);
        polyPartial(ctx, halfL, 0, 1);
        ctx.fill();
        ctx.restore();
      }
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = gold;
      if (draw > 0) {
        ctx.lineWidth = lw * 1.5;
        ctx.beginPath(); polyPartial(ctx, half, 0, draw); polyPartial(ctx, halfL, 0, draw); ctx.stroke();
      }
      if (draw2 > 0) {
        ctx.save();
        ctx.scale(0.84, 0.84);
        ctx.lineWidth = lw * 0.6 / 0.84;
        ctx.beginPath(); polyPartial(ctx, half, 0, draw2); polyPartial(ctx, halfL, 0, draw2); ctx.stroke();
        ctx.restore();
      }
      const dm = EASE.outBack(clamp((d - s0 - CREST_SHIELD * 0.7) / 0.25));
      if (dm > 0) diamond(ctx, 0, -SH * 0.03, size * 0.13 * em * dm, gold);
      ctx.restore();
      // 表示中：光が盾の縁を上から先端へ下り、そのまま上の細線を左右へ流れる
      if (t >= pg.inEnd && t < pg.holdEnd) {
        const v = ((t - pg.inEnd) % 2.8) / 2.8 * 2.5 - 0.15;
        const a = clamp((t - pg.inEnd) / 0.3) * clamp((pg.holdEnd - t) / 0.3) * clamp(k);
        if (a > 0.002) {
          ctx.save();
          ctx.globalAlpha *= a;
          ctx.shadowColor = gold;
          ctx.shadowBlur = size * 0.12 * scale;
          if (v < 1.12) {
            ctx.save();
            ctx.translate(0, ey);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = lw * 1.5;
            ctx.lineCap = 'round';
            ctx.beginPath(); polyPartial(ctx, half, v - 0.12, v); polyPartial(ctx, halfL, v - 0.12, v); ctx.stroke();
            ctx.restore();
          }
          // 先端から帯までの細い線を下る
          const dv = (v - 1) / 0.2;
          if (dv > 0 && dv < 1.4) {
            const y1 = lerp(tipY, bandT, clamp(dv)), y0 = Math.max(tipY, y1 - size * 0.4);
            const g = ctx.createLinearGradient(0, y0, 0, y1);
            g.addColorStop(0, 'rgba(255, 255, 255, 0)');
            g.addColorStop(1, `rgba(255, 255, 255, ${clamp(1.4 - dv)})`);
            ctx.fillStyle = g;
            ctx.fillRect(-lw * 0.6, y0, lw * 1.2, y1 - y0);
          }
          const hv = (v - 1.2) / 1.15;
          if (hv > -0.05 && hv < 1) {
            const x = Math.max(0, hv) * lineW, seg = size * 0.9;
            [1, -1].forEach(dir => {
              const g = ctx.createLinearGradient(dir * (x - seg), 0, dir * x, 0);
              g.addColorStop(0, 'rgba(255, 255, 255, 0)');
              g.addColorStop(1, `rgba(255, 255, 255, ${clamp(1 - hv)})`);
              ctx.fillStyle = g;
              ctx.fillRect(Math.min(dir * (x - seg), dir * x), bandT - lw * 1.25, seg, lw * 1.5);
            });
          }
          ctx.restore();
        }
      }
      // 剣が止まった瞬間：交点に白いきらめき
      const c = d - CREST_SWORDS * 0.5;
      if (c >= 0 && c < 0.45) {
        const q = c / 0.45;
        twinkle(ctx, 0, sy, size * 0.9 * (1 - q * 0.5), '#ffffff', Math.pow(1 - q, 1.5) * clamp(k));
        drawFlash(ctx, 0, sy, size * 0.8, gold, 0.6 * Math.pow(1 - q, 2) * clamp(k));
      }
    }

    // 銃撃：四隅の照準が飛び込んで文字の位置に定まる → 3発の曳光弾が画面の外から飛んできて着弾（光と弾痕）→
    // 斜めの赤い帯が左から走り込み、文字が叩きつけられる。退場では帯が右へ抜け、照準は広がって消える
    drawGunshot(ctx, pg, page, t, scale, scene, sfx, k) {
      const d = t - pg.start;
      if (d < 0) return;
      const { layout } = this.prepared;
      const size = layout.size;
      const red = sfx.color || '#ff2e43';
      const dark = sfx.color2 || '#0d0d10';
      const mb = mainBox(layout, page);
      const b = page.box;
      const W = scene.width, H = scene.height;
      const out = outProgress(pg, t);
      const lw = size * 0.03;
      // 撃つたびに照準が小さく揺れる
      let kick = 0;
      GUN_SHOTS.forEach(s => { const a = d - s.t; if (a >= 0 && a < 0.12) kick += 1 - a / 0.12; });
      const jx = noise1(t * 50, 3) * size * 0.04 * kick, jy = noise1(t * 50, 9) * size * 0.04 * kick;
      // 赤い帯（メインの文字の後ろ）の位置
      const bh = size * 0.6, sk = size * 0.26, pad = size * 0.42;
      const bx0 = mb.x0 - pad, bx1 = mb.x1 + pad, by0 = mb.cy - bh, by1 = mb.cy + bh;
      // 1) 四隅の照準：外から飛び込んで帯と文字を囲む位置に定まり、定まった瞬間に赤く2回光る
      const fx0 = Math.min(bx0 - sk, b.x0) - size * 0.35, fx1 = Math.max(bx1 + sk, b.x1) + size * 0.35;
      const fy0 = mb.cy - size * 1.45, fy1 = b.y1 + size * 0.5;
      const la = clamp(d / 0.1) * (1 - clamp(out / 0.7));
      if (la > 0.002) {
        const spread = (1 - EASE.outBack(clamp(d / GUN_LOCK))) * size * 1.2 + EASE.outCubic(out) * size * 0.8;
        const arm = size * 0.36;
        const lock = d - GUN_LOCK;
        const blink = (lock >= 0 && lock < 0.06) || (lock >= 0.12 && lock < 0.18);
        ctx.save();
        ctx.globalAlpha *= la;
        ctx.strokeStyle = blink ? red : '#ffffff';
        ctx.lineWidth = lw;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        [[fx0, fy0, 1, 1], [fx1, fy0, -1, 1], [fx0, fy1, 1, -1], [fx1, fy1, -1, -1]].forEach(([x, y, sx, sy]) => {
          const px = x - sx * spread + jx, py = y - sy * spread * 0.6 + jy;
          ctx.moveTo(px, py + sy * arm);
          ctx.lineTo(px, py);
          ctx.lineTo(px + sx * arm, py);
        });
        ctx.stroke();
        ctx.restore();
      }
      // 中央の小さな照準（十字と赤い点）。帯が来たら消える
      const ca = clamp((d - 0.1) / 0.12) * (1 - clamp((d - GUN_BAND + 0.08) / 0.1));
      if (ca > 0.002) {
        const x = mb.cx + jx, y = mb.cy + jy, r0 = size * 0.08, r1 = size * 0.22;
        ctx.save();
        ctx.globalAlpha *= ca;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(x - r1, y); ctx.lineTo(x - r0, y); ctx.moveTo(x + r0, y); ctx.lineTo(x + r1, y);
        ctx.moveTo(x, y - r1); ctx.lineTo(x, y - r0); ctx.moveTo(x, y + r0); ctx.lineTo(x, y + r1);
        ctx.stroke();
        ctx.fillStyle = red;
        ctx.beginPath(); ctx.arc(x, y, size * 0.03, 0, TAU); ctx.fill();
        ctx.restore();
      }
      // 2) 着弾：曳光弾が画面の外から走り、白い光と赤い輪が弾けて弾痕が残る
      const holeA = 1 - EASE.inQuad(out);
      const reach = (mb.x1 - mb.x0) / 2;
      const far = Math.hypot(W, H);
      GUN_SHOTS.forEach((s, i) => {
        const a = d - s.t;
        if (a < -GUN_TRACER) return;
        const hx = mb.cx + s.x * reach + (s.ox || 0) * size, hy = mb.cy + s.y * size;
        const n = Math.hypot(s.dx, s.dy), dx = s.dx / n, dy = s.dy / n;
        if (a < 0.1) {
          const head = far * (1 - clamp((a + GUN_TRACER) / GUN_TRACER));
          const tail = head + size * 3.2;
          const ta = a > 0 ? 1 - a / 0.1 : 1;
          const g = ctx.createLinearGradient(hx - dx * tail, hy - dy * tail, hx - dx * head, hy - dy * head);
          g.addColorStop(0, colorWithAlpha(red, 0));
          g.addColorStop(0.7, colorWithAlpha(red, 0.8 * ta));
          g.addColorStop(1, `rgba(255, 255, 255, ${ta})`);
          ctx.save();
          ctx.strokeStyle = g;
          ctx.lineWidth = size * 0.026;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(hx - dx * tail, hy - dy * tail);
          ctx.lineTo(hx - dx * head, hy - dy * head);
          ctx.stroke();
          ctx.restore();
        }
        if (a < 0) return;
        drawBulletHole(ctx, hx, hy, size, 500 + i * 17, EASE.outCubic(clamp(a / 0.08)), holeA, dark);
        if (a < 0.2) {
          const q = a / 0.2;
          ctx.save();
          ctx.globalAlpha *= (1 - q) * clamp(k);
          ctx.strokeStyle = red;
          ctx.lineWidth = lw * 0.8 * (1 - q);
          ctx.beginPath(); ctx.arc(hx, hy, size * (0.12 + 0.45 * EASE.outCubic(q)), 0, TAU); ctx.stroke();
          ctx.restore();
        }
        if (a < 0.09) {
          const q = a / 0.09;
          ctx.save();
          ctx.globalAlpha *= 1 - q;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = size * 0.018;
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let j = 0; j < 8; j++) {
            const ang = (j + rnd(i, j, 41) * 0.5) / 8 * TAU;
            const r1 = size * (0.28 + 0.3 * rnd(i, j, 43)) * (0.7 + 0.3 * q);
            ctx.moveTo(hx + Math.cos(ang) * size * 0.1, hy + Math.sin(ang) * size * 0.1);
            ctx.lineTo(hx + Math.cos(ang) * r1, hy + Math.sin(ang) * r1);
          }
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(hx, hy, size * 0.09 * (1 - q), 0, TAU); ctx.fill();
          ctx.restore();
        }
      });
      // 3) 帯：斜めの赤い帯が左から走り込む（後ろに暗い影の帯）。サブの文字の後ろには暗い色の札。
      // 退場では帯も札も、文字と一緒に斜めの切り口で右へ抜ける
      const bIn = EASE.outExpo(clamp((d - GUN_BAND) / 0.22));
      // 抜けるときは文字の消え方に少し遅れて、文字より先に帯がなくならないように
      const bOut = EASE.inOutCubic(clamp((out - 0.1) / 0.9));
      if (bIn > 0 && bOut < 1) {
        const para = (x0, x1, y0, y1, slant, ox, oy) => {
          ctx.beginPath();
          ctx.moveTo(x0 + slant + ox, y0 + oy); ctx.lineTo(x1 + slant + ox, y0 + oy);
          ctx.lineTo(x1 - slant + ox, y1 + oy); ctx.lineTo(x0 - slant + ox, y1 + oy);
          ctx.closePath();
        };
        const right = lerp(fx0 - size, fx1 + size, bIn);
        const left = lerp(bx0 - sk * 2 - size * 0.3, bx1 + size * 0.3, bOut);
        const slope = sk / bh, top = fy0 - size, bottom = fy1 + size;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(left + slope * (mb.cy - top), top); ctx.lineTo(right + slope * (mb.cy - top), top);
        ctx.lineTo(right - slope * (bottom - mb.cy), bottom); ctx.lineTo(left - slope * (bottom - mb.cy), bottom);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = dark;
        para(bx0, bx1, by0, by1, sk, size * 0.1, size * 0.1);
        ctx.fill();
        ctx.fillStyle = red;
        para(bx0, bx1, by0, by1, sk, 0, 0);
        ctx.fill();
        const sb = page.subBox;
        const sub0 = Number.isFinite(pg.subStart) ? pg.subStart : pg.textStart;
        const e = EASE.outExpo(clamp((t - sub0 + 0.05) / 0.25));
        if (sb && e > 0) {
          const px = size * 0.24, py = size * 0.07;
          const x0 = sb.x0 - px;
          ctx.fillStyle = dark;
          para(x0, lerp(x0, sb.x1 + px, e), sb.y0 - py, sb.y1 + py, size * 0.08, 0, 0);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 炎：導火線のような火が帯の下の線を左から右へ走り、燃えたところから暗い帯と上の線が現れ、文字が立ち上がる →
    // 表示中は下の線から3層の炎が立ちのぼってゆらぎ、火の粉が帯の中を昇る → 退場（燃えて消える）では光る燃え際が左から右へ進み、帯も文字も燃え尽きる。
    // 色は炎の色（線・火の粉）と芯の色（燃えている先端）と暗い帯だけ
    drawFlame(ctx, pg, page, t, scale, scene, sfx, k, layer) {
      if (layer === 'front') return this.drawFlameFront(ctx, pg, page, t, scale, scene, sfx, k);
      const d = t - pg.start;
      if (d < 0) return;
      const size = this.prepared.layout.size;
      const fire = sfx.color || '#ff7a2a';
      const core = sfx.color2 || '#ffd9a0';
      const span = pg.flameSpan || flameSpan(mainBox(this.prepared.layout, page), size);
      const b = page.box;
      const bandT = b.y0 - size * 0.3, bandB = b.y1 + size * 0.3;
      const lw = size * 0.022;
      const burn = burnFront(pg, page, t, scene, size);
      const head = lerp(span.L, span.R, clamp(d / FLAME_RUN));
      const head2 = lerp(span.L, span.R, clamp((d - 0.15) / FLAME_RUN));
      const x0 = burn ? Math.max(span.L, burn.x + burn.soft * 0.5) : span.L;
      const W = span.R - span.L;
      const fadeEnds = (a0, a1, color, alpha) => {
        const g = ctx.createLinearGradient(span.L, 0, span.R, 0);
        g.addColorStop(0, colorWithAlpha(color, 0));
        g.addColorStop(0.3, colorWithAlpha(color, alpha));
        g.addColorStop(0.7, colorWithAlpha(color, alpha));
        g.addColorStop(1, colorWithAlpha(color, 0));
        return g;
      };
      // 暗い帯（燃えたところから現れる）
      if (head2 > x0) {
        ctx.fillStyle = fadeEnds(0, 1, FLAME_BAND, 0.85);
        ctx.fillRect(x0, bandT, head2 - x0, bandB - bandT);
      }
      // 上下の線：下の線は導火線、上の線は少し遅れて追いかける
      ctx.fillStyle = fadeEnds(0, 1, fire, 1);
      if (head > x0) ctx.fillRect(x0, bandB, head - x0, lw);
      if (head2 > x0) ctx.fillRect(x0, bandT - lw, head2 - x0, lw);
      // 走っている間：先端の手前が白熱して冷えていく
      ctx.globalCompositeOperation = 'lighter';
      if (d < FLAME_RUN + 0.3) {
        [[head, bandB + lw / 2, d], [head2, bandT - lw / 2, d - 0.15]].forEach(([hx, y, dd]) => {
          if (dd < 0 || dd > FLAME_RUN + 0.3) return;
          const fade = 1 - clamp((dd - FLAME_RUN) / 0.3);
          const tail = size * 2.4;
          const g = ctx.createLinearGradient(hx - tail, 0, hx, 0);
          g.addColorStop(0, colorWithAlpha(fire, 0));
          g.addColorStop(0.7, colorWithAlpha(core, 0.8 * fade));
          g.addColorStop(1, `rgba(255, 255, 255, ${fade})`);
          ctx.fillStyle = g;
          ctx.fillRect(Math.max(x0, hx - tail), y - lw * 1.2, Math.min(tail, hx - x0), lw * 2.4);
          drawFlash(ctx, hx, y, size * 0.9, fire, 0.7 * fade * clamp(k), 0.6);
        });
      }
      // 下の線から立ちのぼる炎の壁：走る先端のすぐ後ろは高く燃え上がり、そのあとは帯の下半分でゆらぎ続ける。
      // 奥から 深い赤 → 炎の色 → 芯の色 の3層。炎の明かりが帯の下を照らす
      const deep = mixHex(fire, '#7a0c06', 0.45);
      const step = size * 0.2;
      const wall = [];
      for (let i = 0; i * step <= W; i++) {
        const x = span.L + i * step + (rnd(i, 1, 23) - 0.5) * step * 0.7;
        if (x < x0 || x > head) continue;
        const behind = (head - x) / size;
        const rise = d < FLAME_RUN + 0.8 ? Math.exp(-behind * 0.55) * (1 - clamp((d - FLAME_RUN) / 0.8)) : 0;
        const edge = clamp((x - span.L) / (W * 0.28)) * clamp((span.R - x) / (W * 0.28));
        const flick = 0.7 + 0.3 * noise1(t * 4.5, i * 3 + 1);
        const tall = rnd(i, 4, 23) < 0.22 ? 0.35 : 0;
        const calm = (0.5 + 0.3 * rnd(i, 2, 23) + tall) * flick;
        const h = size * (calm + 1.1 * rise) * Math.min(1.6, k) * edge;
        const born = clamp((head - x) / (size * 0.25));
        wall.push({ x, h: h * born, w: size * (0.34 + 0.12 * rnd(i, 3, 23)), i, edge });
      }
      wall.forEach(f => drawFlash(ctx, f.x, bandB, size * 0.7, fire, 0.12 * f.edge * clamp(k), 0.6));
      ctx.globalCompositeOperation = 'source-over';
      wall.forEach(f => flameTongue(ctx, f.x, bandB + lw, f.w, f.h, t, f.i * 5 + 1, fire, deep, 0.75 * f.edge));
      ctx.globalCompositeOperation = 'lighter';
      wall.forEach(f => flameTongue(ctx, f.x, bandB + lw, f.w * 0.62, f.h * 0.72, t, f.i * 5 + 1, core, fire, 0.7 * f.edge));
      wall.forEach(f => flameTongue(ctx, f.x, bandB + lw, f.w * 0.3, f.h * 0.38, t, f.i * 5 + 1, '#ffffff', core, 0.55 * f.edge));
      ctx.fillStyle = fadeEnds(0, 1, fire, 1);
      if (head > x0) ctx.fillRect(x0, bandB, head - x0, lw);
      // 火の粉：帯の中を昇る
      for (let i = 0; i < 18; i++) {
        const x = lerp(span.L, span.R, rnd(i, 1, 61));
        if (x < x0 || x > head) continue;
        const P = 1.4 + rnd(i, 2, 61);
        const age = ((t / P + rnd(i, 3, 61)) % 1) * P;
        const q = age / P;
        const y = bandB - age * size * (0.9 + rnd(i, 4, 61) * 0.6);
        if (y < bandT - size * 0.4) continue;
        ctx.fillStyle = colorWithAlpha(q < 0.4 ? core : fire, 0.9 * (1 - q) * clamp((x - span.L) / (W * 0.15)) * clamp((span.R - x) / (W * 0.15)));
        ctx.beginPath(); ctx.arc(x + Math.sin(age * 3 + i) * size * 0.1, y, size * 0.022 * (1 - q * 0.5), 0, TAU); ctx.fill();
      }
    }

    // 炎の手前：「燃えて消える」の燃え際（帯の高さに光る縦の線と火の粉）
    drawFlameFront(ctx, pg, page, t, scale, scene, sfx, k) {
      const size = this.prepared.layout.size;
      const burn = burnFront(pg, page, t, scene, size);
      if (!burn || burn.p >= 1) return;
      const fire = sfx.color || '#ff7a2a';
      const core = sfx.color2 || '#ffd9a0';
      const b = page.box;
      const top = b.y0 - size * 0.3, bot = b.y1 + size * 0.3;
      const x = burn.x + burn.soft * 0.5;
      const a = clamp(burn.p / 0.05) * clamp((1 - burn.p) / 0.08) * clamp(k);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(x - burn.soft * 0.6, 0, x + size * 0.06, 0);
      g.addColorStop(0, colorWithAlpha(fire, 0));
      g.addColorStop(0.75, colorWithAlpha(fire, 0.55 * a));
      g.addColorStop(1, colorWithAlpha(core, 0.95 * a));
      ctx.fillStyle = g;
      ctx.fillRect(x - burn.soft * 0.6, top, burn.soft * 0.6 + size * 0.06, bot - top);
      ctx.fillStyle = colorWithAlpha(core, 0.8 * a);
      ctx.fillRect(x, top, size * 0.018, bot - top);
      // 燃え際に沿って、下から上へ炎の舌を重ねる（3層）
      const deep = mixHex(fire, '#7a0c06', 0.45);
      const n = Math.ceil((bot - top) / (size * 0.36));
      const rows = [];
      for (let r = 0; r <= n; r++) {
        const y = lerp(bot, top, r / n);
        const h = size * (0.5 + 0.5 * rnd(r, 1, 77)) * (0.75 + 0.25 * noise1(t * 5, r)) * Math.min(1.5, k);
        rows.push({ x: x - size * 0.06 + (rnd(r, 2, 77) - 0.5) * size * 0.22, y: y + (rnd(r, 3, 77) - 0.5) * size * 0.12, h, w: size * (0.3 + 0.14 * rnd(r, 4, 77)), r });
      }
      ctx.globalCompositeOperation = 'source-over';
      rows.forEach(f => flameTongue(ctx, f.x, f.y, f.w, f.h, t, 300 + f.r, fire, deep, 0.7 * a));
      ctx.globalCompositeOperation = 'lighter';
      rows.forEach(f => flameTongue(ctx, f.x, f.y, f.w * 0.6, f.h * 0.7, t, 300 + f.r, core, fire, 0.65 * a));
      rows.forEach(f => flameTongue(ctx, f.x, f.y, f.w * 0.28, f.h * 0.38, t, 300 + f.r, '#ffffff', core, 0.5 * a));
      for (let i = 0; i < 22; i++) {
        const pBorn = rnd(i, 1, 88);
        const age = (burn.p - pBorn) * pg.blockOut.dur;
        const life = 0.5 + rnd(i, 2, 88) * 0.5;
        if (age < 0 || age > life) continue;
        const q = age / life;
        const span = pg.flameSpan;
        const ex = (span ? lerp(span.L - burn.soft, span.R, pBorn) : x) + age * size * (0.5 + rnd(i, 4, 88));
        const ey = lerp(top, bot, rnd(i, 3, 88)) - age * size * (0.8 + rnd(i, 5, 88));
        ctx.fillStyle = colorWithAlpha(q < 0.4 ? core : fire, 1 - q);
        ctx.beginPath(); ctx.arc(ex, ey, size * 0.022 * (1 - q * 0.5), 0, TAU); ctx.fill();
      }
    }

    // ラウンド表示（赤と黒）：消失点から画面の手前へ赤と黒の太い線が伸び、細いすじが奥から飛んでくる →
    // 「ROUND 1」が消失点の近くから斜めに大きくなりながら飛んできて、黒い札と赤い影の上で止まる →
    // 表示中はすじが流れ続け、退場では文字も線も画面の手前へ抜けていく
    drawP5Round(ctx, pg, page, t, scale, scene, sfx, k) {
      const d = t - pg.start;
      if (d < 0) return;
      const size = this.prepared.layout.size;
      const W = scene.width, H = scene.height;
      const red = sfx.color || '#e8112d';
      const dark = sfx.color2 || '#0b0b0e';
      const b = page.box;
      const bcx = (b.x0 + b.x1) / 2, bcy = (b.y0 + b.y1) / 2;
      const vx = bcx + P5_VP.x * size, vy = bcy + P5_VP.y * size;
      const st = p5RoundState(pg, t, size);
      let fade = 1;
      if (Number.isFinite(pg.outEnd)) fade = 1 - clamp((t - (pg.outEnd - 0.1)) / (SFX_TIMING.p5round.tail + 0.1));
      if (fade <= 0) return;
      const far = Math.hypot(W, H) * 1.1;
      const speed = 1 + 2.5 * st.q;
      ctx.save();
      ctx.globalAlpha = fade * (1 - 0.6 * st.q);
      // 1) 消失点から伸びる太い線（くさび形）。順に伸びて、ゆっくり回る
      const rays = 11;
      const spin = d * 0.12 + st.q * 0.4;
      for (let i = 0; i < rays; i++) {
        const grow = EASE.outExpo(clamp((d - i * 0.018) / 0.32));
        if (grow <= 0) continue;
        const a = i / rays * TAU + (rnd(i, 1, 71) - 0.5) * 0.35 + spin;
        const half = (0.035 + 0.1 * rnd(i, 2, 71)) * (i % 4 === 3 ? 0.35 : 1);
        const r0 = size * 0.25, r1 = r0 + (far - r0) * grow;
        ctx.fillStyle = i % 4 === 3 ? 'rgba(255, 255, 255, 0.9)' : (i % 2 ? red : colorWithAlpha(dark, 0.94));
        ctx.beginPath();
        ctx.moveTo(vx + Math.cos(a - half * 0.15) * r0, vy + Math.sin(a - half * 0.15) * r0);
        ctx.lineTo(vx + Math.cos(a - half) * r1, vy + Math.sin(a - half) * r1);
        ctx.lineTo(vx + Math.cos(a + half) * r1, vy + Math.sin(a + half) * r1);
        ctx.lineTo(vx + Math.cos(a + half * 0.15) * r0, vy + Math.sin(a + half * 0.15) * r0);
        ctx.closePath();
        ctx.fill();
      }
      // 2) 奥から飛んでくる細いすじ：手前に来るほど長く太く
      const n = Math.round(46 * Math.min(1.5, k));
      for (let i = 0; i < n; i++) {
        const P = 0.55 + 0.4 * rnd(i, 3, 73);
        const age = ((d * speed / P + rnd(i, 4, 73)) % 1);
        if (d < 0.1 * rnd(i, 5, 73)) continue;
        const a = rnd(i, 6, 73) * TAU;
        const r = size * 0.3 * Math.exp(age * 4);
        if (r > far) continue;
        const len = r * 0.45, w = Math.max(1, r * 0.014);
        const c = Math.cos(a), sn = Math.sin(a);
        const pick = rnd(i, 7, 73);
        ctx.strokeStyle = pick < 0.45 ? 'rgba(255, 255, 255, 0.85)' : (pick < 0.8 ? red : dark);
        ctx.lineWidth = w;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(vx + c * (r - len), vy + sn * (r - len));
        ctx.lineTo(vx + c * r, vy + sn * r);
        ctx.stroke();
      }
      // 3) 文字の後ろの札：文字と同じ動き（大きさ・位置・傾き）で、黒い札に赤い影
      if (st.shown) {
        ctx.save();
        ctx.translate(bcx + st.x, bcy + st.y);
        ctx.rotate(st.r);
        ctx.scale(st.s, st.s);
        ctx.globalAlpha = fade * Math.pow(1 - st.q, 2);
        const w = (b.x1 - b.x0) + size * 0.9, h = (b.y1 - b.y0) + size * 0.34, sk = size * 0.4;
        ctx.fillStyle = red;
        p5Slab(ctx, size * 0.16, size * 0.16, w, h, sk); ctx.fill();
        ctx.fillStyle = dark;
        p5Slab(ctx, 0, 0, w, h, sk); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = size * 0.025;
        p5Slab(ctx, 0, 0, w - size * 0.18, h - size * 0.18, sk); ctx.stroke();
        ctx.restore();
      }
      // 4) 止まった瞬間：白い衝撃の星が広がって消える
      const hit = t - (pg.textStart + P5_ZOOM * 0.55);
      if (hit >= 0 && hit < 0.25) {
        const p = hit / 0.25;
        ctx.save();
        ctx.globalAlpha = fade * (1 - p) * clamp(k);
        ctx.strokeStyle = '#ffffff';
        ctx.lineJoin = 'miter';
        ctx.lineWidth = size * 0.12 * (1 - p);
        p5Star(ctx, bcx, bcy, size * (1.6 + 1.6 * EASE.outCubic(p)), 12, 5, 0.2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // ラウンド表示 Ver2（赤と黒）：画面の奥の一点から、赤と黒の2本の線が斜めに手前へ伸びる →
    // その間を「ROUND 1」が奥から飛んできて止まる → 表示中は線の上を白い光が手前へ流れる →
    // 退場では文字が手前へ抜け、線も奥から手前へ消えていく
    drawP5Round2(ctx, pg, page, t, scale, scene, sfx, k) {
      const d = t - pg.start;
      if (d < 0) return;
      const size = this.prepared.layout.size;
      const red = sfx.color || '#e8112d';
      const dark = sfx.color2 || '#0b0b0e';
      const b = page.box;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      const vx = cx + P5_VP2.x * size, vy = cy + P5_VP2.y * size;
      const len = Math.hypot(P5_VP2.x, P5_VP2.y);
      const nx = -P5_VP2.y / len, ny = P5_VP2.x / len;
      // 線の内側の縁が文字の上端と下端にぴったり接する間隔（文字も同じ遠近で並ぶ）
      const h = (b.y1 - b.y0) / 2;
      const st = p5Round2State(pg, t, size);
      const tail = SFX_TIMING.p5round2.tail;
      const gone = Number.isFinite(pg.outEnd) ? clamp((t - pg.holdEnd) / Math.max(0.05, pg.outEnd + tail - pg.holdEnd)) : 0;
      if (gone >= 1) return;
      // 線の上の点：l = 0 が消失点、l = 1 が文字の上（下）の位置。手前ほど太い
      const LMAX = 7;
      const rail = (side, color, delay, w1) => {
        const grow = EASE.outExpo(clamp((d - delay) / P5_RAIL));
        if (grow <= 0) return;
        const tx = cx + nx * h * side, ty = cy + ny * h * side;
        const at = l => [vx + (tx - vx) * l, vy + (ty - vy) * l];
        const l0 = LMAX * EASE.inCubic(gone), l1 = LMAX * grow;
        if (l1 <= l0) return;
        // 太さは線の外側へ広げ、内側の縁は文字に沿ってまっすぐにする
        const quad = (la, lb, wa, wb, off) => {
          const [ax, ay] = at(la), [bx, by] = at(lb);
          ctx.beginPath();
          ctx.moveTo(ax + nx * side * off * la, ay + ny * side * off * la);
          ctx.lineTo(bx + nx * side * off * lb, by + ny * side * off * lb);
          ctx.lineTo(bx + nx * side * (off + wb) * lb, by + ny * side * (off + wb) * lb);
          ctx.lineTo(ax + nx * side * (off + wa) * la, ay + ny * side * (off + wa) * la);
          ctx.closePath();
          ctx.fill();
        };
        // 文字に接する内側に白い細線、その外側に色の帯
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        quad(l0, l1, w1 * 0.12, w1 * 0.12, 0);
        ctx.fillStyle = color;
        quad(l0, l1, w1, w1, w1 * 0.12);
        // 表示中：白い光が奥から手前へ流れる
        if (st.shown && gone <= 0) {
          const P = 1.1;
          const ph = ((t - pg.textStart) / P + (side > 0 ? 0.5 : 0)) % 1;
          const lc = Math.pow(ph, 2) * LMAX;
          const lw = 0.1 + lc * 0.25;
          if (lc - lw > l0 && lc < l1) {
            ctx.fillStyle = '#ffffff';
            quad(Math.max(l0, lc - lw), lc, w1 * 0.3, w1 * 0.3, 0);
          }
        }
      };
      ctx.save();
      ctx.lineJoin = 'miter';
      rail(-1, red, 0, size * 0.13 * Math.min(1.5, k));
      rail(1, dark, 0.07, size * 0.13 * Math.min(1.5, k));
      // 文字が止まった瞬間：2本の線の間に白い閃光
      const hit = t - (pg.textStart + P5_ZOOM2 * 0.6);
      if (hit >= 0 && hit < 0.25) {
        const p = hit / 0.25;
        ctx.translate(cx, cy);
        ctx.rotate(st.r);
        ctx.globalAlpha = (1 - p) * 0.9 * clamp(k);
        const g = ctx.createLinearGradient(-size * 4, 0, size * 4, 0);
        g.addColorStop(0, 'rgba(255, 255, 255, 0)');
        g.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        g.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g;
        const fh = h * 2 * (0.15 + 0.85 * EASE.outCubic(p));
        ctx.fillRect(-size * 4, -fh / 2, size * 8, fh * (1 - p * 0.6));
      }
      ctx.restore();
    }

    // 戦闘開始と銃撃（赤と黒）：画面の外から3発、着弾のたびに赤いギザギザの衝撃と弾痕が残って画面が揺れる →
    // 斜めの黒い帯が左から走り込み、1文字ずつ赤と黒の札が傾いて飛び出し、その上に文字が出る →
    // 退場では帯も札も文字も左へ一気に抜ける
    drawP5Gun(ctx, pg, page, t, scale, scene, sfx, k) {
      const d = t - pg.start;
      if (d < 0) return;
      const size = this.prepared.layout.size;
      const W = scene.width;
      const red = sfx.color || '#e8112d';
      const dark = sfx.color2 || '#0b0b0e';
      const { layout, timeline } = this.prepared;
      const mb = mainBox(layout, page);
      const b = page.box;
      const bcx = (b.x0 + b.x1) / 2, bcy = (b.y0 + b.y1) / 2;
      const st = p5GunState(pg, t, size, W);
      ctx.save();
      ctx.globalAlpha = 1 - st.q * st.q;
      ctx.translate(bcx + st.x, bcy + st.y);
      ctx.rotate(st.r);
      // 1) 斜めの黒い帯：左から走り込む。上下に赤い帯、内側に白い細線
      const bu = d - P5_BAND;
      if (bu >= 0) {
        const e = EASE.outExpo(clamp(bu / 0.22));
        const h = (b.y1 - b.y0) + size * 0.55;
        const span = W * 2.4;
        const cx = lerp(-W * 1.6, 0, e) - W * 1.4 * st.q;
        ctx.fillStyle = red;
        p5Slab(ctx, cx + size * 0.1, -h / 2 - size * 0.06, span, size * 0.22, size * 0.1); ctx.fill();
        p5Slab(ctx, cx - size * 0.1, h / 2 + size * 0.06, span, size * 0.22, size * 0.1); ctx.fill();
        ctx.fillStyle = dark;
        p5Slab(ctx, cx, 0, span, h, size * 0.3); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(cx - span / 2, -h / 2 + size * 0.1, span, size * 0.02);
        ctx.fillRect(cx - span / 2, h / 2 - size * 0.12, span, size * 0.02);
      }
      // 2) 1文字ずつの札：文字の出るタイミングで傾いて飛び出す。赤と黒を交互に、反対の色の影
      mb.list.forEach((g, i) => {
        const t0 = timeline.inStart[g.index], dur = Math.max(0.05, timeline.inDur[g.index] || 0.3);
        const p = clamp((t - t0 + 0.04) / dur);
        if (p <= 0) return;
        const s = EASE.outBack(p);
        const x = g.cx - bcx, y = g.cy - bcy;
        const tilt = p5CardTilt(g.index);
        const cw = g.size * (1.08 + 0.12 * rnd(g.index, 4, 57)), chh = g.size * (1.12 + 0.14 * rnd(g.index, 5, 57));
        const main = i % 2 ? dark : red, shade = i % 2 ? red : dark;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.scale(s, s);
        ctx.fillStyle = shade;
        ctx.fillRect(-cw / 2 + size * 0.08, -chh / 2 + size * 0.08, cw, chh);
        ctx.fillStyle = main;
        ctx.fillRect(-cw / 2, -chh / 2, cw, chh);
        // 黒い札は帯に沈まないよう、白い細い縁をつける
        if (i % 2) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = size * 0.03;
          ctx.strokeRect(-cw / 2 + size * 0.05, -chh / 2 + size * 0.05, cw - size * 0.1, chh - size * 0.1);
        }
        ctx.restore();
      });
      ctx.restore();
      // 3) 銃弾：画面の外から白い曳光が飛び、着弾で赤い衝撃の星が開いて縮み、弾痕とひびが残る
      const out = 1 - st.q;
      P5_SHOTS.forEach((sh, i) => {
        const u = d - sh.t;
        if (u < -0.07) return;
        const hx = mb.cx + sh.x * (mb.x1 - mb.x0) / 2 + st.x, hy = mb.cy + sh.y * size + st.y;
        if (u < 0) {
          const p = (u + 0.07) / 0.07;
          const sx = i % 2 ? W + size : -size, sy = hy - size * (1.5 - i);
          const ex = lerp(sx, hx, p), ey = lerp(sy, hy, p);
          const g = ctx.createLinearGradient(lerp(sx, ex, 0.4), lerp(sy, ey, 0.4), ex, ey);
          g.addColorStop(0, 'rgba(255, 255, 255, 0)');
          g.addColorStop(1, 'rgba(255, 255, 255, 1)');
          ctx.strokeStyle = g;
          ctx.lineWidth = size * 0.035;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(lerp(sx, ex, 0.4), lerp(sy, ey, 0.4)); ctx.lineTo(ex, ey); ctx.stroke();
          return;
        }
        const burst = u < 0.3 ? EASE.outBack(clamp(u / 0.1)) * (1 - 0.45 * EASE.inOutCubic(clamp((u - 0.1) / 0.2))) : 0.55;
        const R = size * 0.85 * burst * Math.min(1.4, k);
        ctx.save();
        ctx.globalAlpha = out;
        ctx.lineJoin = 'miter';
        p5Star(ctx, hx, hy, R, 9, 40 + i, i * 0.7);
        ctx.fillStyle = red; ctx.fill();
        ctx.strokeStyle = dark; ctx.lineWidth = size * 0.05; ctx.stroke();
        p5Star(ctx, hx, hy, R * 0.55, 9, 60 + i, i * 0.7 + 0.3);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        // ひび
        ctx.strokeStyle = dark;
        ctx.lineWidth = size * 0.02;
        ctx.beginPath();
        for (let c = 0; c < 5; c++) {
          const a = (c + rnd(i, c, 9) * 0.7) / 5 * TAU;
          const r1 = size * (0.16 + 0.3 * rnd(i, c, 11)) * EASE.outCubic(clamp(u / 0.12));
          ctx.moveTo(hx + Math.cos(a) * size * 0.07, hy + Math.sin(a) * size * 0.07);
          ctx.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1);
        }
        ctx.stroke();
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.arc(hx, hy, size * 0.075, 0, TAU); ctx.fill();
        ctx.restore();
        // 着弾の瞬間の白い閃光
        if (u < 0.08) {
          ctx.save();
          ctx.globalAlpha = 1 - u / 0.08;
          ctx.fillStyle = '#ffffff';
          p5Star(ctx, hx, hy, size * 1.3, 12, 80 + i, 0);
          ctx.fill();
          ctx.restore();
        }
      });
    }

    // 判定カットインの帯：文字の後ろの暗い帯（左右はぼかす）と上下の細い線。open で中央の細い線から開く
    drawRollBand(ctx, page, size, W, open, alpha, accent, dark) {
      if (open <= 0.001 || alpha <= 0.002) return;
      const r = rollBandRect(page, size, W);
      const cx = r.cx, cy = r.cy;
      const hh = r.hh * (0.04 + 0.96 * open);
      const half = r.half * (0.2 + 0.32 * Math.min(1, open * 1.6)) / 0.52;
      const edge = clamp(0.5 - r.solid / (2 * r.half), 0.05, 0.25);
      ctx.save();
      ctx.globalAlpha *= clamp(alpha);
      const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
      g.addColorStop(0, colorWithAlpha(dark, 0));
      g.addColorStop(edge, colorWithAlpha(dark, 0.82));
      g.addColorStop(1 - edge, colorWithAlpha(dark, 0.82));
      g.addColorStop(1, colorWithAlpha(dark, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - half, cy - hh, half * 2, hh * 2);
      const lg = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
      lg.addColorStop(0, colorWithAlpha(accent, 0));
      lg.addColorStop(edge + 0.05, colorWithAlpha(accent, 0.9));
      lg.addColorStop(0.95 - edge, colorWithAlpha(accent, 0.9));
      lg.addColorStop(1, colorWithAlpha(accent, 0));
      ctx.fillStyle = lg;
      const lw = Math.max(1, size * 0.012);
      ctx.fillRect(cx - half, cy - hh - lw, half * 2, lw);
      ctx.fillRect(cx - half, cy + hh, half * 2, lw);
      ctx.restore();
    }

    // 抜刀の判定。成功＝一閃 / スペシャル（難成功）＝十字の二閃 / 極成功＝三閃と集中線、火花 /
    // 決定的成功＝三閃のあと円月が文字を囲み、集中線と金の火花 /
    // 失敗＝帯と文字が出たあと、文字の右上の角をかすめて空を斬り、帯に細い跡が残る / 致命的失敗＝刃が文字の中央で折れて砕け、文字が斜めに割れる。
    // 帯・集中線・円月は文字の後ろ、一閃・閃光・火花・破片は文字の手前に描く
    drawBlade(ctx, pg, page, t, scale, scene, sfx, k, layer) {
      const d = t - pg.start;
      if (d < 0) return;
      const tail = SFX_TIMING.blade.tail;
      if (Number.isFinite(pg.outEnd) && t > pg.outEnd + tail) return;
      const tier = rollTier(sfx);
      const plan = BLADE_PLAN[tier];
      const { layout } = this.prepared;
      const size = layout.size;
      const W = scene.width, H = scene.height;
      const accent = sfx.color || '#dbe9ff';
      const dark = sfx.color2 || '#05070b';
      const mb = mainBox(layout, page);
      const cx = mb.cx, cy = mb.cy;
      const L = pg.textStart - pg.start;
      const out = outProgress(pg, t);
      const fade = Number.isFinite(pg.outEnd) ? 1 - clamp((t - pg.holdEnd) / Math.max(0.05, pg.outEnd + tail - pg.holdEnd)) : 1;
      const Lh = Math.hypot(W, H) * 0.6;
      const th = size * 0.085 * k;
      const seed = 700 + pg.index * 11;
      const frame = Math.floor(t * 24);
      // 一閃の線の中点（文字の中心からのずれを含む）と、進む向き。外れる一閃は、文字の枠から少し離れたところを通す
      const origin = c => {
        const off = c.miss
          ? -(Math.abs(Math.sin(c.ang)) * (mb.x1 - mb.x0) / 2 + Math.abs(Math.cos(c.ang)) * (mb.y1 - mb.y0) / 2) - size * 0.2
          : (c.off || 0) * size;
        return { x: cx - Math.sin(c.ang) * off, y: cy + Math.cos(c.ang) * off, a: c.ang + (c.rev ? Math.PI : 0) };
      };
      // 一閃の線の半分の長さ。帯の中だけに描く一閃は、帯を斜めに横切る長さにして、振る間ずっと帯の中に見えるようにする
      const band = rollBandRect(page, size, W);
      const reachOf = c => {
        if (!c.miss) return Lh;
        const oy = origin(c).y;
        return Math.max(Math.abs(band.cy - band.hh - oy), Math.abs(band.cy + band.hh - oy)) / Math.max(0.2, Math.abs(Math.sin(c.ang))) * 1.1;
      };
      const cuts = plan.cuts.slice();
      // 退場が「斬られて左右へ」なら、切れる瞬間にもう一度、最初の一閃と同じ線を走らせる
      if (splitOut(pg) && tier !== 'failure' && tier !== 'fumble') {
        cuts.push({ ...plan.cuts[0], t: katanaCut(pg) - pg.start - BLADE_SWEEP / 2, exit: true });
      }

      // 失敗の一閃は帯の中だけに描く
      const clipBand = () => {
        ctx.beginPath();
        ctx.rect(0, band.cy - band.hh, W, band.hh * 2);
        ctx.clip();
      };

      if (layer === 'back') {
        const open = tier === 'failure' ? EASE.outCubic(clamp(d / 0.4)) : EASE.outExpo(clamp((d - L + 0.03) / 0.3));
        this.drawRollBand(ctx, page, size, W, open, fade, accent, dark);
        // 失敗：空を斬った跡が帯に細く残る
        const c = cuts[0];
        const a = d - c.t - (c.sweep || BLADE_SWEEP);
        if (c.miss && a >= 0) {
          const o = origin(c);
          ctx.save();
          clipBand();
          ctx.translate(o.x, o.y);
          ctx.rotate(o.a);
          bladeLine(ctx, -Lh, Lh, size * 0.008, accent, 0.5 * clamp(a / 0.3) * fade * (1 - out), scale);
          ctx.restore();
        }
        if (tier === 'critical' || tier === 'extreme') {
          const s = d - L;
          const big = tier === 'critical';
          if (s >= 0 && s < 0.6) speedLines(ctx, cx, cy, Math.max(W, H) * 0.3, Math.hypot(W, H) * 0.75, big ? 52 : 40, seed, frame, accent, (big ? 0.6 : 0.45) * Math.pow(1 - s / 0.6, 1.5) * clamp(k), size * 0.035);
          if (big) this.drawBladeRing(ctx, page, mb, size, d - plan.ring, accent, fade, scale);
        }
        return;
      }

      ctx.save();
      if (tier === 'failure') clipBand();
      // 予兆：一閃の通り道に細い線がのび、振る直前に中央できらりと光る
      const c0 = cuts[0];
      const pre = c0.pre || 0;
      if (d >= pre && d < c0.t + 0.03) {
        const o = origin(c0);
        const p = clamp((d - pre) / (c0.t - pre));
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.a);
        const len = reachOf(c0) * 0.85 * EASE.outCubic(p);
        bladeLine(ctx, -len, len, size * 0.007, accent, 0.45 * p, scale);
        ctx.restore();
        const gl = d - (c0.t - 0.1);
        if (gl >= 0 && gl < 0.13) twinkle(ctx, o.x, o.y, size * (c0.miss ? 0.3 : 0.4) * Math.sin(Math.PI * gl / 0.13), '#ffffff', 1);
      }

      cuts.forEach((c, i) => {
        const a = d - c.t;
        if (a < 0) return;
        const o = origin(c);
        const w = th * (c.miss ? 1.3 : 1);
        const alpha = 1;
        const sweep = c.sweep || BLADE_SWEEP;
        const Lc = reachOf(c);
        const end = c.snap != null ? -Lh + 2 * Lh * c.snap : Lh;
        const reach = c.snap != null ? sweep * c.snap : sweep;
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.a);
        if (a < reach) {
          const head = -Lc + 2 * Lc * (a / sweep);
          bladeSliver(ctx, Math.max(-Lc, head - Lc * 1.1), head, w, accent, alpha, scale);
        } else if (c.snap != null) {
          // 折れた刃：届いたところで止まり、光がすぐに消える
          const q = (a - reach) / 0.25;
          if (q < 1) bladeSliver(ctx, Math.max(-Lh, end - Lh * 1.1 * (1 - 0.5 * q)), end, w * (1 - q), accent, 1 - q, scale);
        } else {
          const q = (a - sweep) / BLADE_FADE;
          if (q < 1) {
            bladeLine(ctx, -Lc, Lc, w * 0.7 * (1 - q), accent, alpha * (1 - q * q), scale);
            bladeLine(ctx, -Lc, Lc, size * 0.01, accent, alpha * (1 - q), scale);
          }
        }
        // 刃が文字の中央を通る瞬間の閃光と、刃の向きに散る火花（外れた一閃は何も斬らないので出さない）
        const f = d - (c.t + sweep * 0.5);
        if (!c.miss && c.snap == null && f >= 0 && f < 0.32) {
          drawFlash(ctx, 0, 0, W * 0.45, accent, (c.exit ? 0.7 : 0.85) * clamp(k) * Math.pow(1 - f / 0.32, 2), 0.16);
          sparkBurst(ctx, 0, 0, f, 10, seed + i * 5, size * 9, 0, size * 0.3, accent, 0.32, Math.max(1, size * 0.012), 0, 0.5);
        }
        ctx.restore();
      });
      ctx.restore();

      const s = d - L;
      if (tier === 'critical') {
        // 決め：大きな閃光と金の火花、表示中は文字のまわりにきらめき
        if (s >= 0 && s < 0.5) drawFlash(ctx, cx, cy, W * 0.42, accent, 0.8 * clamp(k) * Math.pow(1 - s / 0.5, 2));
        sparkBurst(ctx, cx, cy, s, 40, seed + 50, size * 14, size * 9, size * 0.35, accent, 1.0, Math.max(1, size * 0.016));
        this.drawRollTwinkles(ctx, mb, size, s, t, seed, accent, fade * (1 - out));
      } else if (tier === 'extreme') {
        // イクストリーム（極成功）：決定的成功より控えめな閃光と火花
        if (s >= 0 && s < 0.4) drawFlash(ctx, cx, cy, W * 0.36, accent, 0.65 * clamp(k) * Math.pow(1 - s / 0.4, 2));
        sparkBurst(ctx, cx, cy, s, 26, seed + 50, size * 12, size * 8, size * 0.3, accent, 0.8, Math.max(1, size * 0.014));
      } else if (tier === 'fumble') {
        this.drawBladeBreak(ctx, cuts[0], origin(cuts[0]), Lh, d, size, W, accent, seed, scale);
        // 割れ目：文字の割れたところに赤い光が細く残り、ときどき揺らぐ
        if (s >= 0) {
          const o = origin(cuts[0]);
          const flick = 0.75 + 0.25 * noise1(t * 9, seed);
          ctx.save();
          ctx.translate(o.x, o.y);
          ctx.rotate(cuts[0].ang);
          const half = (mb.x1 - mb.x0) / 2 + size * 0.5;
          bladeLine(ctx, -half, half, size * 0.012, accent, 0.85 * flick * clamp(s / 0.15) * (1 - out), scale);
          ctx.restore();
        }
      }
    }

    // 円月：決定的成功で、刃の軌跡が文字のまわりを一周する（少し傾けた楕円）。描き終わると細い輪が残り、光が周回する
    drawBladeRing(ctx, page, mb, size, a, accent, alpha, scale) {
      if (a < 0 || alpha <= 0.002) return;
      const b = page.box;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      const rx = (mb.x1 - mb.x0) / 2 + size * 0.6, ry = (b.y1 - b.y0) / 2 + size * 0.42;
      const p = EASE.outCubic(clamp(a / BLADE_RING));
      const a0 = -Math.PI * 0.8;
      const lw = size * 0.06;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.06);
      ctx.scale(1, ry / rx);
      ctx.lineCap = 'round';
      ctx.globalAlpha *= clamp(alpha);
      ctx.shadowColor = accent;
      ctx.shadowBlur = size * 0.15 * scale;
      if (p < 1) {
        // 描いている間：先端ほど太く明るい軌跡
        const trail = Math.min(TAU * p, TAU * 0.85);
        const head = a0 + TAU * p;
        const N = 36;
        for (let j = 0; j < N; j++) {
          const u0 = j / N, u1 = (j + 1) / N;
          ctx.globalAlpha = clamp(alpha) * u1;
          ctx.strokeStyle = j > N - 4 ? '#ffffff' : accent;
          ctx.lineWidth = lw * (0.2 + 0.8 * u1);
          ctx.beginPath();
          ctx.arc(0, 0, rx, head - trail * (1 - u0), head - trail * (1 - u1));
          ctx.stroke();
        }
      } else {
        // 描き終わったあと：細い輪と、輪を回る光
        const done = a - BLADE_RING;
        ctx.globalAlpha = clamp(alpha) * (0.55 + 0.45 * Math.exp(-done * 3));
        ctx.strokeStyle = accent;
        ctx.lineWidth = lw * (0.35 + 0.65 * Math.exp(-done * 5));
        ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.stroke();
        const head = a0 + TAU + done * 2.4;
        ctx.globalAlpha = clamp(alpha);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath(); ctx.arc(0, 0, rx, head - 0.5, head); ctx.stroke();
      }
      ctx.restore();
    }

    // 決定的成功（クリティカル）の余韻：文字のまわりで小さなきらめきが瞬く
    drawRollTwinkles(ctx, mb, size, s, t, seed, accent, alpha) {
      if (s < 0.25 || alpha <= 0.002) return;
      const fadeIn = clamp((s - 0.25) / 0.3);
      for (let i = 0; i < 7; i++) {
        const x = mb.cx + (rnd(seed, i, 61) - 0.5) * (mb.x1 - mb.x0 + size * 1.4);
        const y = mb.cy + (rnd(seed, i, 62) - 0.5) * size * 1.7;
        const ph = ((t + rnd(seed, i, 63) * 1.3) % 1.3) / 1.3;
        const r = size * (0.08 + 0.08 * rnd(seed, i, 64)) * Math.pow(Math.sin(Math.PI * ph), 2);
        twinkle(ctx, x, y, r, i % 2 ? '#ffffff' : accent, alpha * fadeIn);
      }
    }

    // 刀が折れる：刃が止まった点から赤と白のひびが走り、刃の破片が飛んで落ちる
    drawBladeBreak(ctx, c, o, Lh, d, size, W, accent, seed, scale) {
      const reach = BLADE_SWEEP * c.snap;
      const g = d - (c.t + reach);
      if (g < 0 || g > 1.2) return;
      const end = -Lh + 2 * Lh * c.snap;
      const ux = Math.cos(o.a), uy = Math.sin(o.a);
      const px = o.x + ux * end, py = o.y + uy * end;
      if (g < 0.4) drawFlash(ctx, px, py, W * 0.42, accent, 0.95 * Math.pow(1 - g / 0.4, 2));
      if (g < 0.6) {
        const grow = EASE.outCubic(clamp(g / 0.07));
        const fa = 1 - clamp((g - 0.12) / 0.48);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const paths = [];
        for (let i = 0; i < 9; i++) {
          let ang = (i + rnd(seed, i, 21) * 0.7) / 9 * TAU, x = px, y = py;
          const len = size * (0.5 + 0.8 * rnd(seed, i, 22)) * grow;
          const pts = [[x, y]];
          for (let s = 0; s < 4; s++) {
            ang += (rnd(seed, i * 5 + s, 23) - 0.5) * 0.9;
            x += Math.cos(ang) * len / 4;
            y += Math.sin(ang) * len / 4;
            pts.push([x, y]);
          }
          paths.push(pts);
        }
        const stroke = (color, width, alpha) => {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          paths.forEach(pts => { ctx.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1])); });
          ctx.stroke();
        };
        ctx.shadowColor = accent;
        ctx.shadowBlur = size * 0.12 * scale;
        stroke(accent, size * 0.032, fa);
        ctx.shadowBlur = 0;
        stroke('#ffffff', size * 0.011, fa);
        ctx.restore();
      }
      // 刃の破片：止まった点の手前の刃が砕け、前と上へ飛んでから落ちる
      for (let i = 0; i < 12; i++) {
        const s0 = rnd(seed, i, 31);
        const bx = px - ux * size * 1.8 * s0, by = py - uy * size * 1.8 * s0;
        const sp = size * (2 + 5 * rnd(seed, i, 32));
        const side = (rnd(seed, i, 33) - 0.5) * size * 5;
        const vx = ux * sp - uy * side, vy = uy * sp + ux * side - size * (1.5 + 3 * rnd(seed, i, 34));
        const grav = size * 18;
        const x = bx + vx * g, y = by + vy * g + 0.5 * grav * g * g;
        const len = size * (0.3 + 0.45 * rnd(seed, i, 36)), wd = size * 0.08;
        const fa = 1 - clamp((g - 0.55) / 0.5);
        if (fa <= 0.002) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(o.a + (rnd(seed, i, 35) - 0.5) * 16 * g);
        ctx.globalAlpha *= fa;
        ctx.fillStyle = '#eef3f8';
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(1, size * 0.008);
        ctx.beginPath();
        ctx.moveTo(-len / 2, 0);
        ctx.lineTo(len / 2, -wd / 2);
        ctx.lineTo(len * 0.3, wd / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 銃撃の判定。照準が飛び込んで定まり、撃ち抜いた瞬間に文字が出る。
    // 成功＝一発 / スペシャル（ハード）＝二連射 / イクストリーム＝外側の目盛りでロックオンして三点射、集中線と火花 /
    // クリティカル＝外側の目盛りと角の照準でロックオンし、三点射のあとトドメの一発、集中線と金の火花 /
    // 失敗＝帯と文字が出たあと、文字に合わせた照準が揺れて右へ逸れ、弾は文字の右の帯に当たって穴が残る /
    // ファンブル＝引き金を引いても弾が出ず、照準が砕けて落ちる。
    // 帯・照準・衝撃の輪は文字の後ろ、曳光弾・閃光・火花は文字の手前に描く
    drawShot(ctx, pg, page, t, scale, scene, sfx, k, layer) {
      const d = t - pg.start;
      if (d < 0) return;
      const tail = SFX_TIMING.shot.tail;
      if (Number.isFinite(pg.outEnd) && t > pg.outEnd + tail) return;
      const tier = rollTier(sfx);
      const plan = SHOT_PLAN[tier];
      const { layout } = this.prepared;
      const size = layout.size;
      const W = scene.width, H = scene.height;
      const accent = sfx.color || '#dbe9ff';
      const dark = sfx.color2 || '#05070b';
      const mb = mainBox(layout, page);
      const cx = mb.cx, cy = mb.cy;
      const L = pg.textStart - pg.start;
      const out = outProgress(pg, t);
      const fade = Number.isFinite(pg.outEnd) ? 1 - clamp((t - pg.holdEnd) / Math.max(0.05, pg.outEnd + tail - pg.holdEnd)) : 1;
      const seed = 900 + pg.index * 11;
      const frame = Math.floor(t * 24);
      const shots = plan.shots || [];
      const last = shots.length - 1;
      const lw = Math.max(1, size * 0.016);
      // 着弾の強さ：2＝クリティカルのトドメ / 1＝イクストリームの最後の一発 / 0＝そのほか
      const power = i => (i !== last ? 0 : tier === 'critical' ? 2 : tier === 'extreme' ? 1 : 0);
      const spot = i => {
        if (plan.miss) return shotMissSpot(mb, size, W);
        if (i === last) return { x: cx, y: cy };
        const p = SHOT_SPOTS[i % SHOT_SPOTS.length];
        return { x: cx + p[0] * size, y: cy + p[1] * size };
      };

      if (layer === 'back') {
        const open = tier === 'failure' ? EASE.outCubic(clamp(d / 0.4)) : EASE.outExpo(clamp((d - L + 0.03) / 0.3));
        this.drawRollBand(ctx, page, size, W, open, fade, accent, dark);
        if (plan.miss) {
          // 外れた弾：帯に小さな衝撃の輪と、弾の穴が残る
          const a = d - shots[0];
          const p = spot(0);
          if (a >= 0 && a < 0.35) shockRing(ctx, p.x, p.y, size * (0.1 + 0.55 * EASE.outCubic(a / 0.35)), lw * 1.6 * (1 - a / 0.35), accent, (1 - a / 0.35) * clamp(k));
          if (a >= 0) drawBulletHole(ctx, p.x, p.y, size, seed + 3, EASE.outCubic(clamp(a / 0.12)), fade * (1 - out), dark);
        }
        const s = d - L;
        if ((tier === 'critical' || tier === 'extreme') && s >= 0 && s < 0.6) {
          const big = tier === 'critical';
          speedLines(ctx, cx, cy, Math.max(W, H) * 0.3, Math.hypot(W, H) * 0.75, big ? 52 : 40, seed, frame, accent, (big ? 0.6 : 0.45) * Math.pow(1 - s / 0.6, 1.5) * clamp(k), size * 0.035);
        }
        // 着弾の衝撃の輪
        if (!plan.miss) {
          shots.forEach((ts, i) => {
            const pw = power(i);
            const dur = [0.42, 0.5, 0.6][pw];
            const a = d - ts;
            if (a < 0 || a > dur) return;
            const q = a / dur;
            const p = spot(i);
            shockRing(ctx, p.x, p.y, size * (0.2 + [1.4, 2.0, 2.6][pw] * EASE.outCubic(q)), lw * [2, 2.5, 3][pw] * (1 - q), accent, (1 - q) * clamp(k));
            if (pw > 0 && a > 0.07) {
              const q2 = (a - 0.07) / (dur - 0.07);
              shockRing(ctx, p.x, p.y, size * (0.2 + (pw > 1 ? 1.8 : 1.4) * EASE.outCubic(q2)), lw * 1.6 * (1 - q2), '#ffffff', (1 - q2) * clamp(k));
            }
          });
        }
        this.drawShotReticle(ctx, plan, tier, cx, cy, size, d, t, L, out, fade, accent, seed, lw, plan.miss ? spot(0) : null);
        return;
      }

      // 曳光弾：画面の右下の外から着弾点へ走る
      const over = 1;
      shots.forEach((ts, i) => {
        const a = d - (ts - SHOT_TRACER);
        if (a < 0 || a > SHOT_TRACER * over + 0.08) return;
        const p = spot(i);
        const sx = cx + W * 0.8 + rnd(seed, i, 1) * size, sy = cy + H * 0.75 - rnd(seed, i, 2) * size * 1.5;
        const n = Math.hypot(p.x - sx, p.y - sy), ux = (p.x - sx) / n, uy = (p.y - sy) / n;
        const head = n * over * clamp(a / (SHOT_TRACER * over));
        const tl = Math.max(0, head - size * 3.4);
        const ta = a > SHOT_TRACER * over ? 1 - (a - SHOT_TRACER * over) / 0.08 : 1;
        const g = ctx.createLinearGradient(sx + ux * tl, sy + uy * tl, sx + ux * head, sy + uy * head);
        g.addColorStop(0, colorWithAlpha(accent, 0));
        g.addColorStop(0.7, colorWithAlpha(accent, 0.85 * ta));
        g.addColorStop(1, `rgba(255, 255, 255, ${ta})`);
        ctx.save();
        ctx.strokeStyle = g;
        ctx.lineWidth = size * 0.028;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx + ux * tl, sy + uy * tl);
        ctx.lineTo(sx + ux * head, sy + uy * head);
        ctx.stroke();
        ctx.restore();
      });
      // 着弾：白い閃光と、放射状の短い光、火花
      shots.forEach((ts, i) => {
        const a = d - ts;
        if (a < 0) return;
        const p = spot(i);
        if (plan.miss) {
          // 外れた弾：帯に当たった小さな閃光と、細かい火花だけ
          if (a < 0.2) drawFlash(ctx, p.x, p.y, size * 0.9, accent, 0.8 * clamp(k) * Math.pow(1 - a / 0.2, 2));
          sparkBurst(ctx, p.x, p.y, a, 8, seed + i * 7, size * 5, size * 6, size * 0.16, accent, 0.3, Math.max(1, size * 0.01));
          return;
        }
        const pw = power(i);
        const fl = [0.26, 0.38, 0.5][pw];
        if (a < fl) drawFlash(ctx, p.x, p.y, size * [1.7, 2.5, 3.4][pw], accent, [0.9, 0.95, 1][pw] * clamp(k) * Math.pow(1 - a / fl, 2));
        if (a < 0.1) {
          const q = a / 0.1;
          ctx.save();
          ctx.globalAlpha *= 1 - q;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = size * [0.016, 0.02, 0.024][pw];
          ctx.lineCap = 'round';
          ctx.beginPath();
          for (let j = 0; j < 10; j++) {
            const ang = (j + rnd(seed + i, j, 41) * 0.5) / 10 * TAU;
            const r0 = size * 0.2, r1 = size * [0.6, 0.85, 1.1][pw] * (0.6 + 0.4 * rnd(seed + i, j, 43)) * (0.7 + 0.3 * q);
            ctx.moveTo(p.x + Math.cos(ang) * r0, p.y + Math.sin(ang) * r0);
            ctx.lineTo(p.x + Math.cos(ang) * r1, p.y + Math.sin(ang) * r1);
          }
          ctx.stroke();
          ctx.restore();
        }
        if (pw > 1) sparkBurst(ctx, p.x, p.y, a, 40, seed + 50, size * 14, size * 9, size * 0.35, accent, 1.0, Math.max(1, size * 0.016));
        else if (pw > 0) sparkBurst(ctx, p.x, p.y, a, 24, seed + 50, size * 11, size * 8, size * 0.3, accent, 0.7, Math.max(1, size * 0.014));
        else sparkBurst(ctx, p.x, p.y, a, 9, seed + i * 7, size * 7, size * 6, size * 0.22, accent, 0.35, Math.max(1, size * 0.012));
      });
      if (tier === 'critical') this.drawRollTwinkles(ctx, mb, size, d - L, t, seed, accent, fade * (1 - out));
      if (tier === 'fumble') {
        // 弾詰まり：引き金を引いた瞬間に照準の中心が赤く弾け、照準が砕ける
        const a = d - plan.jam;
        if (a >= 0 && a < 0.45) {
          drawFlash(ctx, cx, cy, size * 2.6, accent, 0.9 * Math.pow(1 - a / 0.45, 2));
          shockRing(ctx, cx, cy, size * (0.1 + 0.7 * EASE.outCubic(a / 0.45)), lw * 2 * (1 - a / 0.45), accent, 1 - a / 0.45);
        }
      }
    }

    // 銃撃の照準：切れ目の入った輪と4本の目盛り、内側の小さな輪と中心の点。
    // 外から回りながら縮んで定まり、定まった瞬間に目盛りが2回光る。撃ち抜いたあとは薄くなって文字の後ろに残る
    drawShotReticle(ctx, plan, tier, cx, cy, size, d, t, L, out, fade, accent, seed, lw, miss) {
      const z = EASE.outExpo(clamp(d / 0.3));
      const R0 = size * 0.82;
      let R = R0 * lerp(2.5, 1, z);
      const rot = (1 - z) * 1.5 + d * 0.25;
      let alpha = clamp(d / 0.1) * fade;
      let ox = 0, oy = 0;
      if (plan.lock != null) {
        const lk = d - plan.lock;
        if (lk >= 0 && lk < 0.14) R *= 1 - 0.07 * Math.sin(Math.PI * lk / 0.14);
      }
      if (tier === 'failure') {
        // 文字に合わせようとして揺れ、撃つ直前に右へ逸れる。撃った反動で跳ねて、外れたあとは沈んで消える
        const sway = clamp(d / 0.25);
        ox = noise1(t * 4, 5) * size * 0.3 * sway;
        oy = noise1(t * 4, 9) * size * 0.18 * sway;
        if (miss) {
          const e = EASE.inOutCubic(clamp((d - plan.aim) / Math.max(0.05, plan.shots[0] - 0.04 - plan.aim)));
          ox = lerp(ox, miss.x - cx, e);
          oy = lerp(oy, miss.y - cy, e);
        }
        const kick = d - plan.shots[0];
        if (kick >= 0 && kick < 0.18) { oy -= size * 0.25 * Math.sin(Math.PI * kick / 0.18); }
        const droop = EASE.inCubic(clamp((d - plan.shots[0] - 0.1) / 0.35));
        oy += size * 0.7 * droop;
        alpha *= 1 - droop;
      } else if (tier === 'fumble') {
        const j = clamp(d / 0.3);
        ox = noise1(t * 16, 5) * size * 0.05 * j;
        oy = noise1(t * 16, 9) * size * 0.05 * j;
      } else {
        // 撃ち抜いたあとは広がりながら消え、文字だけが残る
        const s = d - L;
        if (s >= 0) {
          alpha *= 1 - clamp(s / 0.4);
          R *= 1 + 0.5 * EASE.outCubic(clamp(s / 0.4));
        }
        // 連射の反動で小さく揺れる
        (plan.shots || []).forEach(ts => {
          const a = d - ts;
          if (a >= 0 && a < 0.12) { ox += noise1(t * 60, 3) * size * 0.05 * (1 - a / 0.12); oy += noise1(t * 60, 8) * size * 0.05 * (1 - a / 0.12); }
        });
      }
      R *= 1 + 0.35 * EASE.inCubic(out);
      if (alpha <= 0.002) return;
      const locked = plan.lock != null && d >= plan.lock;
      const lk = d - (plan.lock ?? Infinity);
      const blink = (lk >= 0 && lk < 0.06) || (lk >= 0.11 && lk < 0.17);
      const tick = locked && !blink ? accent : '#ffffff';
      const lockP = locked ? EASE.outCubic(clamp(lk / 0.12)) : 0;
      const flash = lk >= 0 && lk < 0.18 ? 1 - lk / 0.18 : 0;
      const x = cx + ox, y = cy + oy;
      const broken = plan.jam != null && d >= plan.jam ? d - plan.jam : -1;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.lineCap = 'butt';
      // クリティカル：外側の目盛りの輪（逆回り）と、四隅から閉じる角の照準（イクストリームは目盛りの輪だけ）
      if (tier === 'critical' || tier === 'extreme') {
        const za = clamp((d - 0.15) / 0.25);
        if (za > 0) {
          ctx.save();
          ctx.globalAlpha *= za;
          ctx.strokeStyle = accent;
          ctx.lineWidth = lw * 1.3;
          const R2 = R * 1.3, rot2 = -d * 0.9;
          for (let i = 0; i < 16; i++) {
            const a0 = rot2 + i / 16 * TAU;
            ctx.beginPath(); ctx.arc(x, y, R2, a0, a0 + TAU / 16 * 0.55); ctx.stroke();
          }
          if (tier === 'critical') {
            const close = EASE.outBack(clamp((d - 0.2) / Math.max(0.05, plan.lock - 0.2)));
            const B = R * lerp(2.8, 1.55, close), arm = R * 0.32;
            ctx.strokeStyle = blink ? '#ffffff' : accent;
            ctx.lineWidth = lw * 1.6;
            ctx.lineJoin = 'miter';
            ctx.beginPath();
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
              const px = x + sx * B, py = y + sy * B * 0.72;
              ctx.moveTo(px, py - sy * arm);
              ctx.lineTo(px, py);
              ctx.lineTo(px - sx * arm, py);
            });
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      // 切れ目の入った輪と目盛り（ファンブルでは4つに砕けて落ちる）
      for (let i = 0; i < 4; i++) {
        ctx.save();
        if (broken >= 0) {
          const a = broken;
          const mid = (i + 0.5) * Math.PI / 2 + rot;
          const ccx = Math.cos(mid) * R * 0.85, ccy = Math.sin(mid) * R * 0.85;
          const v = size * (1.8 + 2 * rnd(seed, i, 71));
          const fx = Math.cos(mid) * v * a, fy = Math.sin(mid) * v * a - size * 1.4 * a + 0.5 * size * 16 * a * a;
          ctx.translate(x + ccx + fx, y + ccy + fy);
          ctx.rotate((rnd(seed, i, 72) - 0.5) * 9 * a);
          ctx.translate(-ccx, -ccy);
          ctx.globalAlpha *= 1 - clamp((a - 0.35) / 0.45);
        } else {
          ctx.translate(x, y);
        }
        ctx.rotate(rot);
        ctx.strokeStyle = broken >= 0 ? accent : (flash > 0 ? tick : '#ffffff');
        ctx.lineWidth = lw * (1 + 1.4 * flash);
        ctx.beginPath(); ctx.arc(0, 0, R, i * Math.PI / 2 + 0.17, (i + 1) * Math.PI / 2 - 0.17); ctx.stroke();
        const ta = i * Math.PI / 2;
        ctx.strokeStyle = broken >= 0 ? accent : tick;
        ctx.lineWidth = lw * 1.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ta) * R * (0.74 - 0.2 * lockP), Math.sin(ta) * R * (0.74 - 0.2 * lockP));
        ctx.lineTo(Math.cos(ta) * R * 1.16, Math.sin(ta) * R * 1.16);
        ctx.stroke();
        ctx.restore();
      }
      if (broken < 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath(); ctx.arc(x, y, R * (0.3 - 0.16 * lockP), 0, TAU); ctx.stroke();
        ctx.fillStyle = tick;
        ctx.beginPath(); ctx.arc(x, y, size * 0.03, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    /* ---------- 星（夢と星空）の判定と「星屑になって消える」 ---------- */

    // 星屑の粒が生まれる場所：ページの文字（メインとサブ）の画を粗く描いて、塗られたところから選ぶ（レイアウトの座標）
    stardustPoints(page, scene, cap = 520, density = 2.4) {
      const { layout } = this.prepared;
      const size = layout.size;
      const list = [];
      for (let i = page.first; i < page.last; i++) {
        const g = layout.glyphs[i];
        if (g && !g.blank) list.push(g);
      }
      const key = `${this.spriteKey}|${cap}|${density}|${list.map(g => `${g.cx.toFixed(1)},${g.cy.toFixed(1)},${g.size.toFixed(1)}`).join(';')}`;
      const cacheName = cap === 520 && density === 2.4 ? 'stardust' : 'stardustAlt';
      if (page[cacheName] && page[cacheName].key === key) return page[cacheName].pts;
      const b = page.box, pad = size * 0.3;
      const res = clamp(40 / Math.max(1, size), 0.08, 0.6);
      const w = Math.max(1, Math.ceil((b.x1 - b.x0 + pad * 2) * res)), h = Math.max(1, Math.ceil((b.y1 - b.y0 + pad * 2) * res));
      const c = makeCanvas(w, h);
      const x = c.getContext('2d');
      const fonts = this.fontsFor(scene);
      list.forEach(g => {
        x.setTransform(res, 0, 0, res, (pad - b.x0) * res, (pad - b.y0) * res);
        x.translate(g.cx + g.ox, g.cy + g.oy);
        if (g.rot) x.rotate(Math.PI / 2);
        x.font = (g.group === 1 ? fonts.subFont : fonts.mainFont)(g.size);
        x.textAlign = g.vertical ? 'center' : 'left';
        x.textBaseline = g.vertical ? 'middle' : 'alphabetic';
        x.fillStyle = '#fff';
        x.fillText(g.ch, 0, 0);
      });
      let data = null;
      try { data = x.getImageData(0, 0, w, h).data; } catch (e) { data = null; }
      const cands = [];
      if (data) {
        for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) if (data[(py * w + px) * 4 + 3] > 100) cands.push(px, py);
      }
      const re = size * STARDUST_HOLE;
      const n = cands.length / 2;
      const want = clamp(Math.round(density * n / (res * res * Math.PI * re * re)), 100, cap);
      const keep = Math.min(1, want / Math.max(1, n));
      const pts = [];
      for (let j = 0; j < cands.length; j += 2) {
        if (rnd(cands[j], cands[j + 1], 97) >= keep) continue;
        pts.push({ x: b.x0 - pad + (cands[j] + rnd(j, 1, 98)) / res, y: b.y0 - pad + (cands[j + 1] + rnd(j, 2, 98)) / res });
      }
      page[cacheName] = { key, pts };
      return pts;
    }

    /* ---------- 文字が灰になって消える ---------- */

    // 退場の状態。崩れる時刻は、前線（左下が先）＋大きなうねり＋細かい粒で決まる（レイアウトの座標。fieldT が秒）
    ashTextState(pg, page, t) {
      const bo = pg.blockOut;
      if (!bo || (bo.fx.id !== 'ashtext' && bo.fx.id !== 'ashtextBlack') || t < bo.start) return null;
      const size = this.prepared.layout.size;
      const b = page.box;
      const bw = Math.max(1, b.x1 - b.x0), bh = Math.max(1, b.y1 - b.y0);
      const span = bw + ASHTEXT_SLANT * bh;
      const sweep = bo.dur * ASHTEXT_SWEEP;
      const seed = 7 + pg.index * 3;
      const rs = size * 0.35;
      const fieldT = (x, y) => {
        const uu = clamp((x - b.x0 + ASHTEXT_SLANT * (b.y1 - y)) / span, 0, 1);
        const n = fbm2(x / rs, y / rs, seed) - 0.5;
        const g = vnoise2(x / (size * 0.04), y / (size * 0.04), seed + 9) - 0.5;
        return bo.start + sweep * clamp(0.14 + 0.72 * uu + 0.3 * n, 0, 1) + 0.12 * g;
      };
      return { start: bo.start, end: bo.start + bo.dur, black: bo.fx.id === 'ashtextBlack', ash: ASHTEXT_COLORS[bo.fx.id === 'ashtextBlack' ? 'black' : 'grey'], fieldT, size, seed };
    }

    // 崩れる時刻のまだら（1画素ごと）。ページの文字の枠のまわりを、書き出し倍率の画素で数えて持っておく
    ashTextField(page, st, scale) {
      const b = page.box, pad = st.size * 0.6;
      const key = `${this.spriteKey}|${scale}|${b.x0.toFixed(1)},${b.y0.toFixed(1)},${b.x1.toFixed(1)},${b.y1.toFixed(1)}|${st.start.toFixed(3)}|${st.end.toFixed(3)}|${st.seed}`;
      if (page.ashField && page.ashField.key === key) return page.ashField;
      const lx0 = Math.floor((b.x0 - pad) * scale), ly0 = Math.floor((b.y0 - pad) * scale);
      const w = Math.ceil((b.x1 + pad) * scale) - lx0, h = Math.ceil((b.y1 + pad) * scale) - ly0;
      const T = new Float32Array(w * h);
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) T[py * w + px] = st.fieldT((lx0 + px + 0.5) / scale, (ly0 + py + 0.5) / scale);
      return (page.ashField = { key, lx0, ly0, w, h, T });
    }

    // 前線が通ったところの文字を、焦げて灰の色になりながら消していく
    applyAshText(pg, page, t, bs, scale, scene) {
      const st = this.ashTextState(pg, page, t);
      if (!st) return;
      const F = this.ashTextField(page, st, scale);
      const lctx = this.lctx;
      const cw = this.layer.width, ch = this.layer.height;
      const ox = Math.round(bs.x * scale), oy = Math.round(bs.y * scale);
      const rx0 = Math.max(0, F.lx0 + ox), ry0 = Math.max(0, F.ly0 + oy);
      const rx1 = Math.min(cw, F.lx0 + ox + F.w), ry1 = Math.min(ch, F.ly0 + oy + F.h);
      if (rx1 <= rx0 || ry1 <= ry0) return;
      let img;
      try { img = lctx.getImageData(rx0, ry0, rx1 - rx0, ry1 - ry0); } catch (err) { return; }
      const d = img.data, w = rx1 - rx0, h = ry1 - ry0;
      const [ar, ag, ab] = st.ash;
      const band = ASHTEXT_BAND;
      for (let py = 0; py < h; py++) {
        const fi = (ry0 + py - oy - F.ly0) * F.w + (rx0 - ox - F.lx0);
        for (let px = 0; px < w; px++) {
          const i4 = (py * w + px) * 4;
          if (!d[i4 + 3]) continue;
          const dt = t - F.T[fi + px];
          if (dt >= 0) { d[i4 + 3] = 0; continue; }
          if (dt < -band) continue;
          const ch2 = Math.pow(clamp((dt + band) / band), 1.6);
          d[i4] += (ar - d[i4]) * ch2; d[i4 + 1] += (ag - d[i4 + 1]) * ch2; d[i4 + 2] += (ab - d[i4 + 2]) * ch2;
        }
      }
      lctx.putImageData(img, rx0, ry0);
    }

    // 灰のかけら：崩れた場所から飛び立ち、風で右上へ。重いものは一度少し沈んでから運ばれ、ひらひら回りながら細かく崩れて消える
    drawAshText(ctx, pg, page, t, scale, scene, bs) {
      const st = this.ashTextState(pg, page, t);
      if (!st) return;
      const pts = this.stardustPoints(page, scene, 1500, 5);
      const k = clamp(scene.outPower ?? 1, 0.3, 2);
      const H = scene.height, u = st.size / 60;
      const [ar, ag, ab] = st.ash;
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      for (let j = 0; j < pts.length; j++) {
        const p = pts[j];
        const R = q => rnd(j, q, 77);
        const kind = R(0) < 0.15 ? 'dust' : 'flake';
        const r0 = R(1);
        const sz = u * (kind === 'dust' ? 0.8 + 0.7 * R(2) : r0 < 0.85 ? 1.8 + 2.4 * R(2) : 4.2 + 3.8 * R(2)) * 1.25;
        const T0 = st.fieldT(p.x, p.y) + 0.04 + 0.1 * R(5);
        let a = t - T0;
        if (a <= 0) continue;
        let life = 2.2 * (0.6 + 0.6 * R(1)) * (kind === 'dust' ? 0.8 : 1);
        life = Math.min(life, st.end - T0);
        if (life <= 0.05 || a >= life) continue;
        const light = clamp(1 - sz / (8 * u * 1.25));
        const tau = 0.45 + 0.4 * (1 - light);
        const ramp = a - tau * (1 - Math.exp(-a / tau));
        const vx = H * k * (0.22 + 0.2 * R(2)) * (0.7 + 0.5 * light);
        const vy = H * k * (0.12 + 0.14 * R(3)) * (0.4 + 0.9 * light);
        const sag = u * (6 + 14 * R(4)) * (1 - light) * (1 - Math.exp(-a / 0.35)) * Math.exp(-a / 1.2);
        const fl = u * (3 + 9 * R(5)) * Math.sin(TAU * ((0.5 + 0.9 * R(6)) * a + R(7)));
        const x = p.x + bs.x + vx * ramp + fl * 0.4, y = p.y + bs.y - vy * ramp + sag + fl;
        const f = a / life;
        const alpha = (1 - EASE.inOutCubic(clamp((f - 0.45) / 0.55))) * (0.75 + 0.25 * R(8));
        const s = sz * (1 - 0.45 * f);
        const lv = 0.55 + 0.9 * R(9);
        const col = l => `${Math.min(255, ar * lv + l) | 0},${Math.min(255, ag * lv + l * 0.96) | 0},${Math.min(255, ab * lv + l * 0.92) | 0}`;
        if (kind === 'dust') {
          const len = (vx * 0.012 + u) * clamp(a / 0.3);
          ctx.strokeStyle = `rgba(${col(0)},${(alpha * 0.8).toFixed(3)})`;
          ctx.lineWidth = s * 1.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x - len, y + len * vy / vx); ctx.lineTo(x, y); ctx.stroke();
          continue;
        }
        const rot = TAU * (R(10) + (R(11) - 0.5) * 1.6 * a);
        const flip = TAU * (R(12) + (0.4 + 1.4 * R(13)) * a);
        const fy = Math.max(0.3, Math.abs(Math.cos(flip)));
        const lum = (ar > 100 ? 26 : 16) * Math.pow(Math.max(0, Math.sin(flip)), 3);
        const sp = ashShape(j % 64);
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s * fy);
        ctx.beginPath(); ctx.moveTo(sp[0], sp[1]);
        for (let q = 2; q < sp.length; q += 2) ctx.lineTo(sp[q], sp[q + 1]);
        ctx.closePath();
        ctx.restore();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${col(lum)})`;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // 「星屑になって消える」の時間と、粒の動き方（rise：漂って昇る / dust：鈍い粉になって落ちる / spiral：ブラックホールへ渦を巻いて落ちる）
    stardustState(pg, page, t, scene) {
      const bo = pg.blockOut;
      if (!bo || bo.fx.id !== 'stardust' || t < bo.start) return null;
      const { layout } = this.prepared;
      const size = layout.size;
      const sfx = sfxOf(scene);
      const dream = sfx.type === 'dream';
      const vamp = sfx.type === 'vampire';
      const star = sfx.type === 'star' || dream;
      const tier = star || vamp ? rollTier(sfx) : 'success';
      const glow = scene.glow && scene.glow.on ? scene.glow.color : (scene.fill && scene.fill.color) || '#fff3b0';
      let mode = 'rise', colors = [glow, '#ffffff', glow];
      if (vamp && (tier === 'failure' || tier === 'fumble')) { mode = 'dust'; colors = tier === 'fumble' ? ['#a01428', '#6a0a1a', '#d03048'] : ['#8a8090', '#6a5060', '#b09aa4']; }
      else if (vamp) colors = ['#ff2a40', '#d0142c', '#ff5a68', '#9a0c20'];
      else if (dream && tier === 'failure') { mode = 'dust'; colors = ['#b9b4cf', '#9a95b3', '#d4d0e2']; }
      else if (dream && tier === 'fumble') { mode = 'mist'; colors = ['#0c0618', '#1c0e34', '#2a1450']; }
      else if (dream) colors = [sfx.color || '#ffd6f0', '#ffffff', '#c4f5ff', '#d6ccff', '#fff0b8'];
      else if (star && tier === 'failure') { mode = 'dust'; colors = ['#9ea3b8', '#80859a', '#c3c6d4']; }
      else if (star && tier === 'fumble') { mode = 'spiral'; colors = ['#efe3ff', '#ffb070', '#c07bff']; }
      else if (star) colors = [sfx.color || '#ffe9a8', '#ffffff', '#bfefff', '#ffc9ec'];
      const mb = mainBox(layout, page);
      const b = page.box;
      const sweep = bo.dur * STARDUST_SWEEP;
      const hole = { x: mb.cx, y: mb.cy, R: size * STAR_HOLE_R };
      const maxD = Math.max(1, Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2);
      const born = (p, i) => {
        if (mode === 'spiral') return bo.start + sweep * (0.3 * rnd(i, 1, 91) + 0.7 * clamp(Math.hypot(p.x - hole.x, p.y - hole.y) / maxD));
        if (mode === 'dust') return bo.start + sweep * (0.75 * rnd(i, 1, 91) + 0.25 * clamp((p.y - b.y0) / Math.max(1, b.y1 - b.y0)));
        return bo.start + sweep * (0.6 * clamp((p.x - b.x0) / Math.max(1, b.x1 - b.x0)) + 0.4 * rnd(i, 1, 91));
      };
      return { start: bo.start, end: bo.start + bo.dur, mode, colors, hole, born, size, dream, vamp, pts: this.stardustPoints(page, scene) };
    }

    // 粒が生まれたところの文字を、やわらかい丸で消していく（文字が粒にほどける）
    applyStardust(pg, page, t, bs, scale, scene) {
      const st = this.stardustState(pg, page, t, scene);
      if (!st) return;
      if (!this.starDisc) {
        const c = makeCanvas(32, 32);
        const x = c.getContext('2d');
        const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.5, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, 32, 32);
        this.starDisc = c;
      }
      const lctx = this.lctx;
      const re = st.size * STARDUST_HOLE * scale;
      lctx.save();
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'destination-out';
      st.pts.forEach((p, i) => {
        const a = t - st.born(p, i);
        if (a < 0) return;
        const k = clamp(a / 0.12);
        const r = re * (0.55 + 0.45 * k);
        lctx.globalAlpha = k;
        lctx.drawImage(this.starDisc, (p.x + bs.x) * scale - r, (p.y + bs.y) * scale - r, r * 2, r * 2);
      });
      lctx.restore();
    }

    // 星屑の粒：生まれた瞬間は白く明るく、そのあとは色づいてまたたきながら漂う（ときどき十字のきらめき）
    drawStardust(ctx, pg, page, t, scale, scene, bs) {
      const st = this.stardustState(pg, page, t, scene);
      const S = root.TextApngStarFx;
      if (!st || !S) return;
      const size = st.size;
      const k = clamp(scene.outPower ?? 1, 0.3, 2);
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      st.pts.forEach((p, i) => {
        const born = st.born(p, i);
        const a = t - born;
        if (a < 0) return;
        const x0 = p.x + bs.x, y0 = p.y + bs.y;
        const ph = rnd(i, 9, 91) * TAU;
        const tw = 0.5 + 0.5 * Math.sin(a * (7 + 8 * rnd(i, 10, 91)) + ph);
        if (st.mode === 'spiral') {
          const H = st.hole;
          const dx = x0 - H.x, dy = y0 - H.y;
          const r0 = Math.hypot(dx, dy), th0 = Math.atan2(dy, dx);
          const T = Math.min(0.55 + 0.6 * clamp(r0 / (size * 4)) + 0.25 * rnd(i, 2, 91), st.end + 0.05 - born);
          if (T <= 0.05 || a >= T) return;
          const pos = q => {
            const rr = r0 * (1 - EASE.inQuad(q));
            const th = th0 + 0.7 * q + 3.4 * q * q * q;
            return [H.x + Math.cos(th) * rr, H.y + Math.sin(th) * rr * (1 - 0.5 * EASE.inQuad(q)), rr];
          };
          const q = a / T;
          const [x, y, rr] = pos(q);
          const [px, py] = pos(Math.max(0, q - 0.035));
          const col = S.mix(st.colors[0], q < 0.55 ? st.colors[1] : st.colors[2], clamp(q * 1.6));
          const al = clamp(a / 0.08) * (1 - EASE.inCubic(q)) * clamp(rr / (H.R * 0.5));
          if (al <= 0.01) return;
          ctx.lineCap = 'round';
          ctx.strokeStyle = S.rgba(col, 0.7 * al);
          ctx.lineWidth = size * (0.006 + 0.006 * rnd(i, 3, 91)) * (1 + q);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
          S.softDot(ctx, x, y, size * 0.018, col, al);
          if (i % 11 === 0) S.glint(ctx, x, y, size * 0.09 * (0.6 + 0.4 * tw), col, al * 0.8);
          return;
        }
        if (st.mode === 'mist') {
          // 灰紫のミストになってほどける：大きなやわらかい雲が、ゆっくり昇りながら広がって消える
          if (i % 3) return;
          const life = Math.min(0.9 + 0.7 * rnd(i, 2, 91), st.end + 0.15 - born);
          if (life <= 0.05 || a >= life) return;
          const q = a / life;
          const x = x0 + size * 0.25 * a + Math.sin(a * 2 + ph) * size * 0.05;
          const y = y0 - size * (0.12 + 0.2 * rnd(i, 4, 91)) * a;
          const r = size * (0.1 + 0.1 * rnd(i, 5, 91)) * (0.7 + 0.8 * q);
          const D = root.TextApngDreamFx;
          D.puff(ctx, x, y, r, r * 0.7, st.colors[i % 3], 0.8 * Math.sin(Math.PI * Math.min(1, q * 1.15)) * clamp(a / 0.08));
          return;
        }
        if (st.mode === 'dust') {
          const life = Math.min(0.6 + 0.5 * rnd(i, 2, 91), st.end + 0.1 - born);
          if (life <= 0.05 || a >= life) return;
          const q = a / life;
          const x = x0 + (rnd(i, 3, 91) - 0.5) * size * 0.35 * a;
          const y = y0 + size * 0.1 * a + size * 0.4 * a * a;
          const al = 0.75 * (1 - q) * (0.8 + 0.2 * tw);
          const r = size * (0.007 + 0.006 * rnd(i, 4, 91));
          S.softDot(ctx, x, y, r * 2.6, st.colors[i % 3], al);
          return;
        }
        const life = Math.min(0.7 + 0.7 * rnd(i, 2, 91), st.end + 0.12 - born);
        if (life <= 0.05 || a >= life) return;
        const q = a / life;
        const ang = -Math.PI / 2 + (rnd(i, 3, 91) - 0.3) * 1.7;
        const v = size * (0.25 + 0.75 * rnd(i, 4, 91)) * k;
        const x = x0 + Math.cos(ang) * v * a * (1 - 0.3 * a) + Math.sin(a * 3 + ph) * size * 0.05 * a;
        const y = y0 + Math.sin(ang) * v * a * (1 - 0.3 * a) - size * 0.12 * a * a;
        const fresh = 1 - clamp(a / 0.15);
        const al = (fresh > 0 ? 1 : 0.4 + 0.6 * tw) * (1 - q * q);
        if (al <= 0.01) return;
        const col = st.colors[i % st.colors.length];
        const r = size * (0.009 + 0.012 * rnd(i, 5, 91)) * (1 - 0.3 * q) * (1 + 0.6 * fresh);
        if (st.vamp && i % 14 === 0) root.TextApngVampireFx.bat(ctx, x, y, size * 0.075 * (1 - 0.4 * q) * (0.8 + 0.4 * tw), { flap: tw, alpha: al, ang: -0.2 });
        else if (st.dream && i % 13 === 0) root.TextApngDreamFx.star5(ctx, x, y, r * 2.6, col, al * (0.6 + 0.4 * tw), a * 2 + i);
        else if (st.vamp) {
          // 赤い粒：外側は紅、芯は明るい赤。ときどき暗い紅のかけら（明るい背景でも暗い背景でも見える）
          if (i % 6 === 0) { ctx.fillStyle = `rgba(74, 5, 16, ${(0.85 * al).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, TAU); ctx.fill(); }
          else if (i % 9 === 0) S.glint(ctx, x, y, r * 6 * (0.55 + 0.45 * tw), col, al);
          else { S.softDot(ctx, x, y, r * 3.6, col, 0.75 * al); S.softDot(ctx, x, y, r * 1.5, '#ff8a92', al); }
        } else if (i % 9 === 0) S.glint(ctx, x, y, r * 7 * (0.55 + 0.45 * tw), col, al);
        else {
          S.softDot(ctx, x, y, r * 4, col, 0.55 * al);
          S.softDot(ctx, x, y, r * 1.3, '#ffffff', al);
        }
      });
      ctx.restore();
    }

    // 星の判定の帯：深い藍の夜空の帯（左右はぼかす）に小さな星がまたたき、上下に淡い光の線。open で中央の細い線から開く
    drawStarBand(ctx, r, size, open, alpha, accent, dark, t, seed, tier) {
      const S = root.TextApngStarFx;
      if (open <= 0.001 || alpha <= 0.002) return;
      const cx = r.cx, cy = r.cy;
      const hh = r.hh * (0.04 + 0.96 * open);
      const half = r.half * (0.2 + 0.32 * Math.min(1, open * 1.6)) / 0.52;
      const edge = clamp(0.5 - r.solid / (2 * r.half), 0.05, 0.25);
      ctx.save();
      ctx.globalAlpha *= clamp(alpha);
      const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
      g.addColorStop(0, colorWithAlpha(dark, 0));
      g.addColorStop(edge, colorWithAlpha(dark, 0.86));
      g.addColorStop(1 - edge, colorWithAlpha(dark, 0.86));
      g.addColorStop(1, colorWithAlpha(dark, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - half, cy - hh, half * 2, hh * 2);
      const lg = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
      lg.addColorStop(0, colorWithAlpha(accent, 0));
      lg.addColorStop(edge + 0.08, colorWithAlpha(accent, 0.55));
      lg.addColorStop(0.5, colorWithAlpha(accent, 0.8));
      lg.addColorStop(0.92 - edge, colorWithAlpha(accent, 0.55));
      lg.addColorStop(1, colorWithAlpha(accent, 0));
      ctx.fillStyle = lg;
      const lw = Math.max(1, size * 0.008);
      ctx.fillRect(cx - half, cy - hh - lw, half * 2, lw);
      ctx.fillRect(cx - half, cy + hh, half * 2, lw);
      // 帯の中の星（致命的失敗はブラックホールに吸い込まれる星を別に描く）
      if (S && tier !== 'fumble' && open > 0.3) {
        const dim = tier === 'failure' ? 0.45 : 1;
        for (let i = 0; i < 48; i++) {
          const u = rnd(seed, i, 71) * 2 - 1;
          const x = cx + u * half * 0.95, y = cy + (rnd(seed, i, 72) * 2 - 1) * hh * 0.88;
          const side = clamp((1 - Math.abs(u)) / 0.25);
          const tw = 0.5 + 0.5 * Math.sin(t * (2 + 3 * rnd(seed, i, 73)) + rnd(seed, i, 74) * TAU);
          const al = (0.25 + 0.6 * tw) * dim * side * clamp((open - 0.3) / 0.5);
          if (i % 8 === 0) S.glint(ctx, x, y, size * (0.05 + 0.04 * tw), i % 16 ? '#bfefff' : accent, al);
          else S.softDot(ctx, x, y, size * (0.012 + 0.012 * rnd(seed, i, 75)), '#ffffff', al);
        }
      }
      ctx.restore();
    }

    // 星（夢と星空）の判定。成功＝流れ星が文字を通り抜けて文字が現れ、きらめきが散る / スペシャル（ハード）＝流れ星が3つ /
    // 極成功（イクストリーム）＝流れ星が4つと、文字のまわりに星座がつながる / 決定的成功＝流星群のあと大きな星の光が弾け、星座が文字を一周する /
    // 失敗＝帯と文字が出たあと、流れ星が文字に届かずに失速して消える / 致命的失敗＝ブラックホールが生まれ、星を吸い込む。
    // 帯・流れ星・星座・ブラックホールは文字の後ろ、決めの光ときらめきは文字の手前に描く。退場は「星屑になって消える」と組み合わせる
    drawStar(ctx, pg, page, t, scale, scene, sfx, k, layer) {
      const S = root.TextApngStarFx;
      if (!S) return;
      const d = t - pg.start;
      if (d < 0) return;
      const tier = rollTier(sfx);
      const plan = STAR_PLAN[tier];
      const tail = plan.tail ?? SFX_TIMING.star.tail;
      const hasOut = Number.isFinite(pg.outEnd);
      if (hasOut && t > pg.outEnd + tail) return;
      const { layout } = this.prepared;
      const size = layout.size;
      const W = scene.width, H = scene.height;
      const accent = sfx.color || '#ffe9a8';
      const dark = sfx.color2 || '#0b0a24';
      const mb = mainBox(layout, page);
      const cx = mb.cx, cy = mb.cy;
      const L = pg.textStart - pg.start;
      const s = d - L;
      const out = outProgress(pg, t);
      const fadeAt = hasOut ? pg.holdEnd + 0.4 * (pg.outEnd - pg.holdEnd) : Infinity;
      // 帯は粒が漂う間は暗いまま残り、最後に急いで消える（明るい背景でも粒が見えるように）
      const fade = hasOut ? 1 - EASE.inQuad(clamp((t - fadeAt) / Math.max(0.05, pg.outEnd + tail - fadeAt))) : 1;
      const band = rollBandRect(page, size, W);
      const seed = 900 + pg.index * 13;
      const textW = mb.x1 - mb.x0;
      const ux = Math.cos(STAR_ANG), uy = Math.sin(STAR_ANG);
      const speed = W * STAR_SPEED;
      const pastel = ['#ffffff', accent, '#bfefff', '#ffc9ec'];
      // またたき・円盤の回転は1秒に12回だけ変える（表示中のコマが2枚ずつ同じになり、書き出しが軽くなる）
      const tq = Math.floor(t * STAR_TWINKLE_FPS) / STAR_TWINKLE_FPS;
      // 流れ星：tp に文字の中心から off（文字の大きさが単位）だけ横にずれた点を通る
      const mk = (tp, off, w, extra = {}) => ({
        tp, x: cx - uy * off * size, y: cy + ux * off * size, ang: STAR_ANG, speed, len: size * 3.4 * Math.sqrt(w), w: size * 0.024 * w,
        color: accent, seed: seed + Math.round(tp * 100) + Math.round(off * 10), alpha: fade, ...extra
      });

      if (layer === 'back') {
        const open = tier === 'failure' ? EASE.outCubic(clamp(d / 0.4))
          : tier === 'fumble' ? EASE.outCubic(clamp((d - 0.05) / 0.5))
            : EASE.outExpo(clamp((d - L + 0.16) / 0.38));
        this.drawStarBand(ctx, band, size, open, fade, accent, dark, tq, seed, tier);
        if (tier === 'fumble') { this.drawStarHole(ctx, pg, t, d, L, size, W, cx, cy, band, seed, fade, tq - pg.start); return; }
        const meteors = [];
        if (tier === 'failure') {
          // 文字の左上を目指して飛んでくるが、文字の手前で失速する
          const sp = W * 1.3;
          meteors.push({ tp: plan.fizzle + 0.04, x: mb.x0 - size * 0.55, y: mb.y0 + size * 0.05, ang: STAR_ANG, speed: sp, len: size * 3, w: size * 0.022, pre: 1.0,
            fizzle: plan.fizzle, color: '#d4d8ea', seed: seed + 5, sparks: 8, alpha: fade });
        } else {
          (plan.meteors || []).forEach(m => meteors.push(mk(m.tp, m.off, m.w)));
          if (plan.shower) {
            for (let i = 0; i < plan.shower; i++) {
              const off = (rnd(seed, i, 81) * 2 - 1) * 2.4;
              meteors.push(mk(0.1 + plan.showerSpan * i / plan.shower + 0.04 * rnd(seed, i, 82), off, 0.45 + 0.35 * rnd(seed, i, 83), { color: pastel[i % 4] === '#ffffff' ? accent : pastel[i % 4], sparks: 3 }));
            }
          }
          meteors.push(mk(L, -0.2, tier === 'critical' ? 1.4 : 1.1, { big: true, sparks: 18 }));
        }
        meteors.forEach(m => S.meteor(ctx, m, d));
        if (plan.stars) {
          const st = plan.stars;
          const p = EASE.inOutCubic(clamp((d - st.at) / st.dur));
          if (p > 0) S.constellation(ctx, this.starPoints(page, mb, band, size, st, seed), p, tq, accent, fade * (1 - 0.5 * out), st.closed, Math.max(1, size * 0.007));
        }
        if (tier === 'critical' && s >= 0 && s < STAR_RAYS) {
          // 決めの瞬間の光の筋（ゆっくり回りながら薄れる）
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(s * 0.25);
          const ra = 0.6 * Math.pow(1 - s / STAR_RAYS, 1.5) * clamp(k);
          for (let i = 0; i < 16; i++) {
            const a = i / 16 * TAU + rnd(seed, i, 85) * 0.2;
            const len = size * (1.8 + 2.2 * rnd(seed, i, 86)) * EASE.outCubic(clamp(s / 0.2));
            const w = size * (0.02 + 0.025 * rnd(seed, i, 87));
            ctx.fillStyle = S.rgba(i % 2 ? accent : '#ffffff', ra);
            ctx.beginPath();
            ctx.moveTo(Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w);
            ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
            ctx.lineTo(Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w);
            ctx.fill();
          }
          ctx.restore();
        }
        return;
      }

      // 手前：決めの光、散るきらめき、表示中のきらめき
      if (tier === 'fumble') {
        // 最後：つぶれたブラックホールの名残が一瞬光る
        if (hasOut) {
          const g = t - (pg.outEnd + 0.02);
          if (g >= 0 && g < 0.28) S.glint(ctx, cx, cy, size * 0.7 * Math.sin(Math.PI * g / 0.28), '#c07bff', 0.9, 0.3);
        }
        if (s >= 0 && s < 0.4) drawFlash(ctx, cx, cy, W * 0.35, '#7a2bd9', 0.5 * Math.pow(1 - s / 0.4, 2));
        return;
      }
      if (tier === 'failure') return;
      if (s >= 0 && s < 0.4) drawFlash(ctx, cx, cy, W * (tier === 'critical' ? 0.42 : 0.36), accent, (tier === 'critical' ? 0.85 : 0.55) * clamp(k) * Math.pow(1 - s / 0.4, 2), tier === 'critical' ? 0.55 : 0.4);
      if (tier === 'critical' && s >= 0 && s < 0.7) {
        const r = size * 2.6 * EASE.outCubic(clamp(s / 0.12)) * (1 - s / 0.7);
        S.glint(ctx, cx, cy, r, accent, 1, 0.12 + s * 0.3);
      }
      // 散るきらめき
      const nB = plan.burst || 0;
      for (let i = 0; i < nB && s >= 0; i++) {
        const life = 0.65 + 0.5 * rnd(seed, i, 91);
        if (s > life) continue;
        const q = s / life;
        const x0 = cx + (rnd(seed, i, 92) - 0.5) * textW * 0.8, y0 = cy + (rnd(seed, i, 93) - 0.5) * size * 0.5;
        const a = Math.atan2(y0 - cy + (rnd(seed, i, 94) - 0.5) * size * 0.4, x0 - cx + (rnd(seed, i, 95) - 0.5) * size) ;
        const v = size * (2 + 4 * rnd(seed, i, 96)) * (tier === 'critical' ? 1.4 : 1);
        const dist = v * (1 - Math.exp(-3 * s)) / 3;
        const x = x0 + Math.cos(a) * dist, y = y0 + Math.sin(a) * dist - size * 0.2 * s * s;
        const tw = 0.6 + 0.4 * Math.sin(s * (10 + 8 * rnd(seed, i, 97)) + i);
        const col = pastel[i % 4] === '#ffffff' ? accent : pastel[i % 4];
        const al = (1 - q * q) * tw * fade;
        if (i % 3 === 0) S.glint(ctx, x, y, size * (0.12 + 0.12 * rnd(seed, i, 98)) * (1 - 0.5 * q), col, al);
        else S.softDot(ctx, x, y, size * 0.05, col, al);
      }
      // 表示中のきらめき
      const nG = plan.glints || 0;
      const ga = fade * (1 - out) * clamp((s - 0.3) / 0.3);
      for (let i = 0; i < nG && ga > 0.003; i++) {
        const x = cx + (rnd(seed, i, 61) - 0.5) * (textW + size * 1.8);
        const y = band.cy + (rnd(seed, i, 62) - 0.5) * band.hh * 1.8;
        const ph = ((tq + rnd(seed, i, 63) * 1.4) % 1.4) / 1.4;
        const r = size * (0.12 + 0.12 * rnd(seed, i, 64)) * Math.pow(Math.sin(Math.PI * ph), 2);
        S.glint(ctx, x, y, r, pastel[(i + 1) % 4] === '#ffffff' ? accent : pastel[(i + 1) % 4], ga, rnd(seed, i, 65) * 0.4);
      }
    }

    // 星座の星の位置：文字のまわりの楕円の上（帯の中）に並べる。閉じた星座は一周、開いた星座は左から上を通って右へ
    starPoints(page, mb, band, size, st, seed) {
      const key = `${mb.x0},${mb.x1},${band.cy},${band.hh},${st.n}`;
      if (page.starPts && page.starPts.key === key) return page.starPts.pts;
      const rx = (mb.x1 - mb.x0) / 2 + size * 0.9, ry = band.hh * 0.8;
      const pts = [];
      for (let i = 0; i < st.n; i++) {
        const a = st.closed ? Math.PI + i / st.n * TAU + (rnd(seed, i, 51) - 0.5) * 0.25
          : Math.PI * 0.9 + i / (st.n - 1) * Math.PI * 1.2 + (rnd(seed, i, 51) - 0.5) * 0.2;
        const m = 0.88 + 0.22 * rnd(seed, i, 52);
        pts.push({ x: band.cx + Math.cos(a) * rx * m, y: band.cy + Math.sin(a) * ry * m, r: size * (i % 3 === 0 ? 0.2 : 0.12 + 0.05 * rnd(seed, i, 53)) });
      }
      page.starPts = { key, pts };
      return pts;
    }

    // 致命的失敗のブラックホール：光の点が反転して黒い芯が生まれ、降着円盤が回りだし、帯の星が渦を巻いて吸い込まれる。
    // 文字が出る瞬間に紫の衝撃の輪。退場の終わりに芯がつぶれて消える
    drawStarHole(ctx, pg, t, d, L, size, W, cx, cy, band, seed, fade, dq) {
      const S = root.TextApngStarFx;
      const R = size * STAR_HOLE_R;
      const hasOut = Number.isFinite(pg.outEnd);
      const form = clamp((d - 0.15) / 0.42);
      const collapse = hasOut ? clamp((t - (pg.outEnd - 0.35)) / 0.45) : 0;
      // はじまり：中央に紫の光の点が灯り、ふくらんでから黒く反転する
      if (d < 0.42) S.glint(ctx, cx, cy, size * 0.9 * Math.sin(Math.PI * clamp(d / 0.42)), '#c07bff', 1, d * 3);
      // 吸い込まれる星（またたきと同じく、1秒に STAR_TWINKLE_FPS 回だけ動かす）
      const P = 1.5, holdEndD = pg.holdEnd - pg.start;
      // 星は帯の中に収まるように、平たい楕円を描いて落ちる
      const flat = clamp(band.hh * 0.95 / (W * 0.42), 0.15, 0.6);
      for (let i = 0; i < 32; i++) {
        const o = rnd(seed, i, 41) * P;
        const kk = Math.floor((dq - 0.2 - o) / P);
        if (kk < 0) continue;
        const ts = 0.2 + o + kk * P;
        if (ts > holdEndD) continue;
        const a = dq - ts, T = 1.2 + 0.5 * rnd(seed + kk, i, 42);
        if (a > T) continue;
        const r0 = R * 1.8 + (W * 0.42 - R * 1.8) * rnd(seed + kk, i, 43);
        const th0 = rnd(seed + kk, i, 44) * TAU;
        const pos = q => {
          const rr = r0 * (1 - EASE.inQuad(q));
          const th = th0 + 0.5 * q + 3 * q * q * q;
          return [cx + Math.cos(th) * rr, cy + Math.sin(th) * rr * flat, rr];
        };
        const q = a / T;
        const [x, y, rr] = pos(q);
        const [px, py] = pos(Math.max(0, q - 0.035));
        const al = clamp(a / 0.2) * clamp(rr / R - 0.6) * fade * (1 - collapse);
        if (al <= 0.01) continue;
        const col = q < 0.5 ? '#ffffff' : '#ffb070';
        ctx.lineCap = 'round';
        ctx.strokeStyle = S.rgba(col, 0.6 * al);
        ctx.lineWidth = size * 0.01;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        S.softDot(ctx, x, y, size * 0.045, col, al);
        if (i % 5 === 0) S.glint(ctx, x, y, size * 0.1, '#e9d6ff', al * (1 - q));
      }
      S.blackHole(ctx, cx, cy, R, { t: dq, form, collapse, alpha: 1, part: 'back' });
      S.blackHole(ctx, cx, cy, R, { t: dq, form, collapse, alpha: 1, part: 'front' });
      const s = d - L;
      if (s >= 0 && s < 0.7) shockRing(ctx, cx, cy, R * (1.1 + 4 * EASE.outCubic(s / 0.7)), size * 0.05 * (1 - s / 0.7), '#b06cff', 0.8 * (1 - s / 0.7));
    }

    /* ---------- 夢（魔法と夢）の判定 ---------- */

    // 夢の判定。パステルの夢の帯が開き、左から右へ光る星の群れが流れて文字の真ん中を通る瞬間に文字が現れ、きらめきが散る。
    // 成功＝星の群れ / スペシャル（ハード）＝雲とミストのリボンと蝶が加わる / 極成功＝虹のアーチと蝶が4つ /
    // 決定的成功＝二重の虹・蝶の群れ・大きな星の光 / 失敗＝星が文字に届かずに薄れ、灰色のミストが寄ってきて、蝶が遠くへ去る /
    // 致命的失敗＝悪夢：暗い雲がきらめきをのみ込み、虹が灰色ににじみ、蝶がほどけて消える。
    // 帯・虹・星・ミストは文字の後ろ、蝶・決めの光・きらめきは文字の手前に描く。退場は「星屑になって消える」と組み合わせる
    drawDream(ctx, pg, page, t, scale, scene, sfx, k, layer) {
      const D = root.TextApngDreamFx, S = root.TextApngStarFx;
      if (!D || !S) return;
      const d = t - pg.start;
      if (d < 0) return;
      const tier = rollTier(sfx);
      const plan = DREAM_PLAN[tier];
      const tail = plan.tail ?? SFX_TIMING.dream.tail;
      const hasOut = Number.isFinite(pg.outEnd);
      if (hasOut && t > pg.outEnd + tail) return;
      const { layout } = this.prepared;
      const size = layout.size;
      const W = scene.width;
      const accent = sfx.color || '#ffd6f0';
      const tint = sfx.color2 || '#7a68b8';
      const mb = mainBox(layout, page);
      const cx = mb.cx, cy = mb.cy;
      const L = pg.textStart - pg.start;
      const s = d - L;
      const out = outProgress(pg, t);
      const fadeAt = hasOut ? pg.holdEnd + 0.4 * (pg.outEnd - pg.holdEnd) : Infinity;
      const fade = hasOut ? 1 - EASE.inQuad(clamp((t - fadeAt) / Math.max(0.05, pg.outEnd + tail - fadeAt))) : 1;
      const band = rollBandRect(page, size, W);
      const hh = band.hh;
      const seed = 1300 + pg.index * 13;
      const tq = Math.floor(t * DREAM_FPS) / DREAM_FPS;
      const mq = Math.floor(t * 6) / 6;
      const fail = tier === 'failure', fum = tier === 'fumble';
      const textW = mb.x1 - mb.x0;
      const PASTEL = [accent, '#ffd6f0', '#d6ccff', '#c4f5ff', '#fff0b8'];
      const MIST = fail ? ['#b9b4cf', '#9a95b3', '#d4d0e2'] : fum ? ['#0a0414', '#160a28', '#241040'] : ['#ffdcee', '#dcd2ff', '#d0f0ff', '#ffffff'];

      if (layer === 'back') {
        const open = fum ? EASE.outCubic(clamp((d - 0.05) / 0.5)) : EASE.outCubic(clamp(d / 0.4));
        D.dreamBand(ctx, band, size, open, fade, accent, tint, tq, seed, tier);
        // 虹の五線：五線譜のように、虹色の平行な線が左から右へゆるやかなS字を描いて流れる（文字の後ろを通り、帯の外にもはみ出す）
        if (plan.rainbow) {
          const crit = plan.rainbow === 'double';
          const ra = fade * (1 - 0.45 * out);
          const base = { x0: -W * 0.06, x1: W * 1.06, cy: band.cy, size, seed, cycles: 1.25 };
          D.rainbowStaff(ctx, { ...base, A: hh * 0.55, g: hh * (crit ? 0.12 : 0.14), n: crit ? 7 : 6, w: size * (crit ? 0.036 : 0.046), phase: -0.6, alpha: ra },
            EASE.outCubic(clamp((d - (crit ? 0.08 : 0.12)) / 0.8)));
          if (crit) {
            D.rainbowStaff(ctx, { ...base, A: hh * 0.5, g: hh * 0.095, n: 5, w: size * 0.026, phase: -0.6 + Math.PI * 0.8, alpha: ra * 0.75 },
              EASE.outCubic(clamp((d - 0.24) / 0.8)));
          }
        }
        // 雲とミストのリボン
        const mistA = (fail ? 0.3 : fum ? 0.55 : 0.4) * fade * clamp(d / 0.4);
        const lanes = [0.62, -0.7, 0.0];
        for (let j = 0; j < plan.mist; j++) {
          D.mistBank(ctx, { x0: -W * 0.1, x1: W * 1.1, y: band.cy + lanes[j] * hh, h: size * (j === 2 ? 0.9 : 0.7), n: j === 2 ? 6 : 9, seed: seed + j * 7, colors: MIST,
            alpha: mistA * (j === 2 ? 0.5 : 1) * (tier === 'success' ? 0.7 : 1), speed: W * (0.04 + 0.02 * j) }, mq);
        }
        // 失敗・致命的失敗：左右から灰色の雲が文字へ寄ってくる
        if (fail || fum) {
          const c = EASE.outCubic(clamp((d - (fum ? 0.25 : 0.35)) / (fum ? 0.9 : 1.1)));
          const n = fum ? 9 : 4;
          for (let side = 0; side < 2; side++) {
            for (let i = 0; i < n; i++) {
              const xs = side ? W * (1.05 + 0.15 * rnd(seed, i, 21)) : -W * (0.05 + 0.15 * rnd(seed, i, 21));
              const reach = fum ? 0.9 : 0.35;
              const xe = side ? mb.x1 + size * (0.5 - reach * rnd(seed, i, 22) * (textW / size) * 0.5) : mb.x0 - size * (0.5 - reach * rnd(seed, i, 22) * (textW / size) * 0.5);
              const x = xs + (xe - xs) * c;
              const y = band.cy + (rnd(seed, i + side * 20, 23) - 0.5) * hh * 1.7 + Math.sin(tq * 1.3 + i) * size * 0.04;
              const r = size * (0.5 + 0.5 * rnd(seed, i, 24));
              D.puff(ctx, x, y, r * (fum ? 1.25 : 1), r * (fum ? 0.8 : 0.62), MIST[(i + side) % 3], (fum ? 0.85 : 0.3) * fade * clamp(c * 2.5) * (1 - 0.7 * out));
            }
          }
        }
        if (fum) this.drawNightmare(ctx, d, tq, band, size, W, hh, mb, seed, fade, out);
        // 左から右へ流れる光る星（先頭の1つが大きい）
        const x0 = -size * 0.5;
        for (let i = 0; i < plan.sweep; i++) {
          const hero = i === 0;
          const r = size * (hero ? (tier === 'critical' ? 0.3 : fail ? 0.22 : 0.24) : 0.07 + 0.07 * rnd(seed, i, 11));
          const t0 = hero ? 0 : 0.35 * rnd(seed, i, 12);
          let v, until;
          if (fail || fum) {
            // 文字の左で力尽きて薄れる
            const stopAt = (fum ? 0.45 : 0.62) * (hero ? 1 : 0.6 + 0.4 * rnd(seed, i, 14));
            const xs = mb.x0 - size * (0.35 + 0.5 * (hero ? 0 : rnd(seed, i, 15)));
            v = (xs - x0) / Math.max(0.2, stopAt - t0);
            until = stopAt;
          } else {
            const tc = hero ? L : Math.max(t0 + 0.25, L * (0.75 + 0.5 * rnd(seed, i, 13)));
            v = (cx - x0) / (tc - t0);
          }
          const off = hero ? 0 : (rnd(seed, i, 16) * 2 - 1) * hh * 0.85;
          const amp = hh * (hero ? 0.28 : 0.1 + 0.2 * rnd(seed, i, 17));
          const ph = hero ? 0 : rnd(seed, i, 18) * TAU;
          const fq = TAU / (W * 0.6);
          const yBase = hero || !(fail || fum) ? cy : cy;
          const dim = fail ? 0.8 : fum ? 0.5 : 1;
          const total = (W + size) / v + (hero ? 0.5 : 0.35);
          if (d - t0 > total + 0.2) continue;
          D.sweepStar(ctx, { x0, v, t0, y: x => yBase + off + amp * Math.sin((x - cx) * fq + ph), r, seed: seed + i * 5, alpha: fade * dim,
            color: fail ? D.desat(PASTEL[(i + 1) % 5], 0.45) : fum ? (i ? '#8a5cd8' : '#b79aff') : hero ? accent : PASTEL[i % 5] === accent ? '#ffffff' : PASTEL[i % 5],
            trail: hero ? 0.5 : 0.32, until, dieT: 0.35, xEnd: W + size }, d);
        }
        return;
      }

      // 手前：蝶、決めの光、散るきらめき、表示中のきらめき
      const flyN = plan.fly;
      for (let i = 0; i < flyN; i++) {
        const up = i % 2 === 0;
        const bs = size * (tier === 'critical' ? (0.26 + 0.14 * rnd(seed, i, 31)) : 0.32 + 0.08 * rnd(seed, i, 31));
        const wing = D.WINGS[(i + (fail ? 2 : fum ? 1 : 0)) % D.WINGS.length];
        const fr = 2.4 + 0.8 * rnd(seed, i, 32);
        const ph = rnd(seed, i, 33) * TAU;
        const flap = tt => Math.pow(0.5 + 0.5 * Math.sin(tt * TAU * fr + ph), 0.7);
        let u0, dur, laneY, wob;
        if (fail) {
          // 左から舞い込み、文字の近くでためらってから、上へ遠ざかる
          u0 = 0.2; dur = 2.1;
          const u = (d - u0) / dur;
          if (u < 0 || u > 1) continue;
          const bx = -bs + (W * 0.88 + bs) * Math.pow(u, 0.85);
          const by = band.cy - hh * (0.95 + 0.5 * u * u) + Math.sin(u * 9) * size * 0.05 + hh * 0.35 * Math.max(0, 1 - u * 3);
          D.butterfly(ctx, bx, by, bs, { flap: flap(d) * (1 - 0.4 * u), ang: 0.2 + 0.5 * u, c1: D.desat(wing[0], 0.5), c2: D.desat(wing[1], 0.5), alpha: fade * clamp(u / 0.1) * (1 - EASE.inQuad(clamp((u - 0.5) / 0.5))), glow: 0.4 });
          continue;
        }
        u0 = 0.1 + (tier === 'critical' ? 0.55 : 0.45) * (i / Math.max(1, flyN - 1)) + 0.1 * rnd(seed, i, 37);
        dur = 1.5 + 0.4 * rnd(seed, i, 38);
        const u = (d - u0) / dur;
        if (u < 0 || u > 1) continue;
        laneY = band.cy + (up ? -1 : 1) * hh * (1.0 + 0.12 * rnd(seed, i, 39));
        wob = Math.sin(u * TAU * (1.2 + 0.5 * rnd(seed, i, 40)) + ph) * size * 0.16;
        const bx = -bs * 1.5 + (W + bs * 3) * u;
        const by = laneY + wob;
        const lean = Math.cos(u * TAU * 1.3 + ph) * 0.2 + 0.2;
        D.butterfly(ctx, bx, by, bs, { flap: flap(d), ang: lean, c1: wing[0], c2: wing[1], alpha: fade * clamp(u / 0.08) * clamp((1 - u) / 0.1), glow: 1 });
        // 羽ばたきの鱗粉
        for (let m = 1; m <= 5; m++) {
          const lag = m * 0.06;
          const uu = u - lag / dur;
          if (uu < 0) continue;
          const sx = -bs * 1.5 + (W + bs * 3) * uu - bs * 0.2, sy = laneY + Math.sin(uu * TAU * (1.2 + 0.5 * rnd(seed, i, 40)) + ph) * size * 0.16 + lag * size * 0.5 + (rnd(seed, i * 9 + m, 41) - 0.5) * bs * 0.5;
          S.softDot(ctx, sx, sy, size * 0.03 * (1 - m / 6), PASTEL[(i + m) % 5], 0.7 * (1 - m / 6) * fade);
        }
      }

      if (fail || fum) {
        // 文字が出る瞬間の冷たい光（致命的失敗は暗い紫の揺らぎ）
        if (fum) {
          if (s >= 0 && s < 0.4) drawFlash(ctx, cx, cy, W * 0.35, '#5a22b8', 0.4 * Math.pow(1 - s / 0.4, 2));
          // 手前にも黒紫の雲が少し流れる（文字の読みやすさのため薄く、帯の下寄り）
          const c = EASE.outCubic(clamp((d - 0.4) / 0.9));
          for (let i = 0; i < 5; i++) {
            const x = (i < 3 ? mb.x0 : mb.x1) + (rnd(seed, i, 52) - 0.5) * size * 1.5;
            const r = size * (0.45 + 0.3 * rnd(seed, i, 53));
            D.puff(ctx, x, band.cy + hh * (0.55 + 0.3 * rnd(seed, i, 54)) + Math.sin(tq * 1.1 + i) * size * 0.03, r, r * 0.5, MIST[i % 3], 0.55 * fade * c * (1 - 0.7 * out));
          }
        } else if (s >= 0 && s < 0.4) drawFlash(ctx, cx, cy, W * 0.3, '#ffffff', 0.25 * Math.pow(1 - s / 0.4, 2));
        return;
      }
      if (s >= 0 && s < 0.4) drawFlash(ctx, cx, cy, W * (tier === 'critical' ? 0.42 : 0.36), accent, (tier === 'critical' ? 0.8 : 0.5) * clamp(k) * Math.pow(1 - s / 0.4, 2), tier === 'critical' ? 0.55 : 0.4);
      if (tier === 'critical' && s >= 0 && s < 0.7) {
        D.star5(ctx, cx, cy, size * 0.5 * EASE.outCubic(clamp(s / 0.15)) * (1 - s / 0.7), accent, 0.9 * (1 - s / 0.7), s * 1.5);
        shockRing(ctx, cx, cy, size * (0.5 + 3 * EASE.outCubic(s / 0.7)), size * 0.04 * (1 - s / 0.7), '#ffffff', 0.55 * (1 - s / 0.7));
      }
      // 散るきらめき（ときどき小さな星）
      for (let i = 0; i < plan.burst && s >= 0; i++) {
        const life = 0.7 + 0.5 * rnd(seed, i, 91);
        if (s > life) continue;
        const q = s / life;
        const x0 = cx + (rnd(seed, i, 92) - 0.5) * textW * 0.8, y0 = cy + (rnd(seed, i, 93) - 0.5) * size * 0.5;
        const a = Math.atan2(y0 - cy + (rnd(seed, i, 94) - 0.5) * size * 0.4, x0 - cx + (rnd(seed, i, 95) - 0.5) * size);
        const v = size * (1.8 + 3.6 * rnd(seed, i, 96)) * (tier === 'critical' ? 1.3 : 1);
        const dist = v * (1 - Math.exp(-3 * s)) / 3;
        const x = x0 + Math.cos(a) * dist, y = y0 + Math.sin(a) * dist - size * 0.25 * s * s;
        const tw = 0.6 + 0.4 * Math.sin(s * (10 + 8 * rnd(seed, i, 97)) + i);
        const col = PASTEL[i % 5];
        const al = (1 - q * q) * tw * fade;
        if (i % 4 === 0) D.star5(ctx, x, y, size * (0.05 + 0.04 * rnd(seed, i, 98)) * (1 - 0.4 * q), col, al, s * 3 + i);
        else if (i % 3 === 0) S.glint(ctx, x, y, size * (0.12 + 0.12 * rnd(seed, i, 98)) * (1 - 0.5 * q), col, al);
        else S.softDot(ctx, x, y, size * 0.05, col, al);
      }
      // 表示中のきらめき
      const ga = fade * (1 - out) * clamp((s - 0.3) / 0.3);
      for (let i = 0; i < plan.glints && ga > 0.003; i++) {
        const x = cx + (rnd(seed, i, 61) - 0.5) * (textW + size * 1.8);
        const y = band.cy + (rnd(seed, i, 62) - 0.5) * hh * 1.8;
        const ph = ((tq + rnd(seed, i, 63) * 1.4) % 1.4) / 1.4;
        const r = size * (0.12 + 0.12 * rnd(seed, i, 64)) * Math.pow(Math.sin(Math.PI * ph), 2);
        S.glint(ctx, x, y, r, PASTEL[(i + 1) % 5], ga, rnd(seed, i, 65) * 0.4);
      }
    }

    // ヴァンパイアの判定。成功系：深紅と黒の帯が開き、たくさんのコウモリが画面を横切って文字の真ん中へ群がり、散っていくあとに文字が現れる
    // （スペシャル＝群れが増えて赤い月と霧 / クリティカル＝大群・満月・血の閃光が文字の着地に弾ける）。
    // 失敗＝上下から牙が迫って噛み合い（ガチッ）、血の滴が飛び散ってから、色あせた暗い文字が現れる /
    // ファンブル＝牙が叩きつけるように噛み合い、画面いっぱいに血しぶきが広がって垂れ、ひび割れた血まみれの文字が暗く現れる。
    // 帯・月・霧・牙・血しぶきは文字の後ろ、手前のコウモリ・閃光・したたり・ひびは文字の手前に描く。退場は「星屑になって消える」と組み合わせる
    drawVampire(ctx, pg, page, t, scale, scene, sfx, k, layer) {
      const V = root.TextApngVampireFx, S = root.TextApngStarFx;
      if (!V || !S) return;
      const d = t - pg.start;
      if (d < 0) return;
      const tier = rollTier(sfx);
      const plan = VAMPIRE_PLAN[tier];
      const tail = plan.tail ?? SFX_TIMING.vampire.tail;
      const hasOut = Number.isFinite(pg.outEnd);
      if (hasOut && t > pg.outEnd + tail) return;
      const { layout } = this.prepared;
      const size = layout.size;
      const W = scene.width, H = scene.height;
      const accent = sfx.color || '#d0203c';
      const tint = sfx.color2 || '#1a0309';
      const mb = mainBox(layout, page);
      const cx = mb.cx, cy = mb.cy;
      const L = pg.textStart - pg.start;
      const s = d - L;
      const out = outProgress(pg, t);
      const fadeAt = hasOut ? pg.holdEnd + 0.4 * (pg.outEnd - pg.holdEnd) : Infinity;
      const fade = hasOut ? 1 - EASE.inQuad(clamp((t - fadeAt) / Math.max(0.05, pg.outEnd + tail - fadeAt))) : 1;
      const band = rollBandRect(page, size, W);
      const hh = band.hh;
      const seed = 1700 + pg.index * 13;
      const fail = tier === 'failure', fum = tier === 'fumble';
      const textW = mb.x1 - mb.x0;
      const mq = Math.floor(t * 8) / 8;

      // コウモリの群れ：四方から文字の真ん中をかすめて飛び、通り抜けて画面の外へ散る。i%3==0 は文字の奥、ほかは手前
      const flock = front => {
        const n = plan.bats;
        const ext = Math.hypot(W, H) * 0.55 + size;
        for (let i = 0; i < n; i++) {
          const isFront = i % 3 !== 0;
          if (isFront !== front) continue;
          const R = q => rnd(seed, i, q);
          const th = (R(1) < 0.62 ? 0 : Math.PI) + (R(2) - 0.5) * 2.0 - 0.18;
          const dx = Math.cos(th), dy = Math.sin(th);
          const tc = Math.max(0.3, L * (0.78 + 0.45 * R(4)));
          const v = Math.max(W * (1.1 + 0.9 * R(5)), ext / tc * 1.03);
          const along = v * (d - tc);
          if (Math.abs(along) > ext * 1.1) continue;
          const lat = (R(3) * 2 - 1) * hh * 1.5 + Math.sin(d * TAU * (0.9 + 0.8 * R(6)) + R(7) * TAU) * size * 0.22;
          const x = cx + dx * along - dy * lat, y = cy + dy * along + dx * lat;
          const near = Math.exp(-Math.pow((d - tc) / 0.22, 2));
          const sz = size * (isFront ? 0.24 + 0.24 * R(8) : 0.15 + 0.1 * R(8)) * (1 + 0.45 * near);
          const flap = 0.5 + 0.5 * Math.sin(d * TAU * (5.5 + 2 * R(9)) + R(10) * TAU);
          V.bat(ctx, x, y, sz, { flap, ang: Math.atan2(dy, Math.abs(dx)) * 0.35 + 0.15 * Math.sin(d * 6 + i), dir: dx >= 0 ? 1 : -1, alpha: fade, rim: accent });
        }
      };

      if (layer === 'back') {
        if (fail || fum) {
          this.drawVampireBite(ctx, d, band, size, W, H, mb, seed, fade, out, fum, plan, accent, tint, V, S);
          return;
        }
        // 赤い霧、赤い月、帯、奥のコウモリ
        const open = EASE.outCubic(clamp(d / 0.4));
        for (let j = 0; j < plan.mist; j++) {
          const lanes = [0.7, -0.75, 0.05];
          const y = band.cy + lanes[j] * hh;
          for (let m = 0; m < 7; m++) {
            const x = ((m / 7 + 0.07 * j + mq * (0.05 + 0.03 * j) * (j % 2 ? -1 : 1)) % 1 + 1) % 1 * (W * 1.3) - W * 0.15;
            V.puff(ctx, x, y + Math.sin(mq * 1.3 + m + j) * size * 0.06, size * (0.7 + 0.4 * rnd(seed, m + j * 9, 21)), size * 0.32, m % 2 ? '#7a0a1e' : '#b01830', 0.3 * fade * clamp(d / 0.5) * (j === 2 ? 0.7 : 1));
          }
        }
        if (plan.moon > 0) {
          const e = EASE.outCubic(clamp(d / 0.5));
          const r = size * plan.moon * (0.85 + 0.15 * e);
          V.moon(ctx, cx, cy - hh * 0.15 - (1 - e) * size * 0.5, r, (tier === 'critical' ? 0.95 : 0.8) * e * fade * (1 - 0.25 * out), { color: tier === 'critical' ? '#ff2e40' : '#d8283c', pulse: 0.5 + 0.5 * Math.sin(mq * 3), seed });
        }
        V.band(ctx, band, size, open, fade * (plan.moon > 0 ? 0.72 : 1), accent, tint, tier);
        flock(false);
        return;
      }

      // 手前：コウモリ、着地の光、散る火の粉
      flock(true);
      if (fail || fum) {
        this.drawVampireFront(ctx, d, s, mb, size, textW, seed, fade, out, fum, plan, V);
        return;
      }
      if (s >= 0 && s < 0.4) drawFlash(ctx, cx, cy, W * (tier === 'critical' ? 0.4 : 0.3), accent, (tier === 'critical' ? 0.7 : 0.4) * clamp(k) * Math.pow(1 - s / 0.4, 2), 0.45);
      if (plan.flare > 0 && s >= 0 && s < 0.6) {
        V.flare(ctx, cx, cy, size * 1.6 * plan.flare, s / 0.6, '#ff2a3c', seed);
        shockRing(ctx, cx, cy, size * (0.4 + 3 * EASE.outCubic(s / 0.6)), size * 0.035 * (1 - s / 0.6), '#ff9aa6', 0.5 * (1 - s / 0.6));
      }
      for (let i = 0; i < plan.burst && s >= 0; i++) {
        const life = 0.7 + 0.5 * rnd(seed, i, 91);
        if (s > life) continue;
        const q = s / life;
        const x0 = cx + (rnd(seed, i, 92) - 0.5) * textW * 0.8, y0 = cy + (rnd(seed, i, 93) - 0.5) * size * 0.5;
        const a = Math.atan2(y0 - cy + (rnd(seed, i, 94) - 0.5) * size * 0.4, x0 - cx + (rnd(seed, i, 95) - 0.5) * size);
        const v = size * (1.6 + 3.2 * rnd(seed, i, 96));
        const dist = v * (1 - Math.exp(-3 * s)) / 3;
        const x = x0 + Math.cos(a) * dist, y = y0 + Math.sin(a) * dist - size * 0.3 * s * s;
        const al = (1 - q * q) * fade * (0.6 + 0.4 * Math.sin(s * 14 + i));
        const col = i % 3 === 0 ? '#ffd9d0' : i % 3 === 1 ? '#ff3a48' : '#c0182e';
        if (i % 5 === 0) V.bat(ctx, x, y, size * 0.09 * (1 - 0.4 * q), { flap: 0.5 + 0.5 * Math.sin(s * 30 + i), alpha: al, rim: accent });
        else S.softDot(ctx, x, y, size * (0.035 + 0.03 * rnd(seed, i, 97)), col, al);
      }
    }

    // ヴァンパイアの失敗系（奥）：白い牙の列（上あごと下あご）が上下から迫って噛み合い、clap の時刻に小さく揺れる。
    // 噛んだ点から血がひとつながりの塊としてにじむように広がり（失敗は文字の奥にほどよく、ファンブルは画面いっぱいに）、牙は去る
    drawVampireBite(ctx, d, band, size, W, H, mb, seed, fade, out, fum, plan, accent, tint, V, S) {
      const cx = mb.cx, cy = mb.cy;
      const clap = plan.clap;
      const sc = d - clap;
      const SS = size * (fum ? 1.5 : 1.3) * 0.88;
      const fa = fade * (1 - 0.3 * out);
      // 帯は噛み合ったあとで開く
      V.band(ctx, band, size, EASE.outCubic(clamp((d - clap - 0.05) / 0.4)), fade, accent, tint, fum ? 'fumble' : 'failure');
      ctx.save();
      if (sc >= 0) {
        const sh = Math.exp(-sc * 11) * size * (fum ? 0.05 : 0.035);
        ctx.translate(noise1(d * 40, 3) * sh, noise1(d * 40, 9) * sh);
      }
      if (sc >= 0) {
        // 噛んだ点に叩きつけた血の飛沫（はじめの0.14秒でいっぺんに広がり、そのあとは落ち着いて垂れる）
        if (fum) V.splatter(ctx, cx, cy, size * 1.5, sc, { seed: seed + 5, alpha: fa, reach: 1.2, streaks: 44, drops: 130, drips: 6 });
        else V.splatter(ctx, cx, cy, size * 0.95, sc, { seed: seed + 5, alpha: fa, reach: 1.0, streaks: 28, drops: 64, drips: 4 });
        if (sc < 0.16) drawFlash(ctx, cx, cy, W * (fum ? 0.5 : 0.35), '#ff6a7a', (fum ? 0.55 : 0.4) * Math.pow(1 - sc / 0.16, 2), 0.5);
      }
      // 牙：閉じる（だんだん速く）→ 噛み合ったまま一拍 → はじかれるように開いて去る
      const closedGap = SS * 1.0;
      const away = SS * 1.75;
      let topY, botY, ta = 1;
      if (sc < 0) {
        const e1 = Math.pow(clamp(d / clap), 2.4);
        topY = -away + (cy - closedGap + away) * e1;
        botY = H + away - (H + away - (cy + closedGap)) * e1;
      } else {
        const u2 = EASE.outCubic(clamp((sc - 0.1) / 0.45));
        topY = cy - closedGap - (cy - closedGap + away) * u2;
        botY = cy + closedGap + (H + away - cy - closedGap) * u2;
        ta = 1 - EASE.inQuad(clamp((sc - 0.15) / 0.4));
      }
      if (ta > 0.01) {
        V.teethRow(ctx, cx, topY, SS, 1, { alpha: ta * fade, shadow: '#1a0208' });
        V.teethRow(ctx, cx, botY, SS, -1, { alpha: ta * fade, lower: true, shadow: '#1a0208' });
      }
      ctx.restore();
    }

    // ヴァンパイアの失敗系（手前）：文字が出る瞬間の暗い血の光。ファンブルは文字に細いひびが走る
    drawVampireFront(ctx, d, s, mb, size, textW, seed, fade, out, fum, plan, V) {
      const cx = mb.cx, cy = mb.cy;
      if (s >= 0 && s < 0.35) drawFlash(ctx, cx, cy, size * 4, fum ? '#c0182e' : '#7a1020', (fum ? 0.3 : 0.2) * Math.pow(1 - s / 0.35, 2), 0.5);
      if (fum && s >= 0) {
        V.cracks(ctx, cx - textW * 0.08, cy, textW * 0.45, EASE.outCubic(clamp(s / 0.3)), seed, 0.55 * fade * (1 - 0.5 * out), size * 0.01);
      }
    }

    // 牙の戦闘開始：暗い帯の上下から牙の列がだんだん速く迫って噛み合い（重い揺れ・閃光・衝撃波）、文字が叩きつけられる。
    // 噛み合ったまま一拍おいて、あごが開いて上下へ去り、帯が開いて文字が残る。退場は帯が文字と一緒に右へ抜ける（血は出さない）
    drawFang(ctx, pg, page, t, scale, scene, sfx, k, layer) {
      const V = root.TextApngVampireFx, S = root.TextApngStarFx;
      if (!V || !S) return;
      const d = t - pg.start;
      if (d < 0) return;
      const hasOut = Number.isFinite(pg.outEnd);
      if (hasOut && t > pg.outEnd + 0.05) return;
      const { layout } = this.prepared;
      const size = layout.size;
      const W = scene.width, H = scene.height;
      const fill = sfx.color || '#f7f3ea';
      const rim = sfx.color2 || '#4d493f';
      const b = page.box;
      // 文字のない牙だけの演出（fangFx）は画面の中央で噛む
      const bare = sfx.type === 'fangFx';
      const cx = bare ? W / 2 : (b.x0 + b.x1) / 2, cy = bare ? H / 2 : (b.y0 + b.y1) / 2;
      const clap = FANG_CLAP;
      const sc = d - clap;
      const out = outProgress(pg, t);
      // 帯の色は牙の色を深く沈めた色（白はほぼ黒、赤は黒ずんだ赤、黒は黒）
      const dark = S.mix(fill, '#050507', 0.9);
      const lum = (() => { const c = S.mix(fill, '#000000', 0); const m = /#?([0-9a-f]{6})/i.exec(String(c)); if (!m) return 1; const n = parseInt(m[1], 16); return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; })();
      const SS = bare ? Math.min(H * 0.25, W * 0.14) : Math.min(size * 1.15, W * 0.14);
      const ringW = bare ? SS * 0.075 : size * 0.07;
      if (layer === 'back') {
        // 帯：噛み合ったあとで上下に開く。退場では左から文字と一緒に右へ抜ける
        const open = EASE.outCubic(clamp((sc - 0.04) / 0.36));
        const bOut = EASE.inOutCubic(clamp((out - 0.1) / 0.9));
        if (!bare && open > 0.001 && bOut < 1) {
          const hh = ((b.y1 - b.y0) / 2 + size * 0.3) * open;
          const left = lerp(0, W, bOut);
          ctx.save();
          ctx.beginPath(); ctx.rect(left, 0, W - left, H); ctx.clip();
          const g = ctx.createLinearGradient(0, 0, W, 0);
          g.addColorStop(0, colorWithAlpha(dark, 0)); g.addColorStop(0.1, colorWithAlpha(dark, 0.86));
          g.addColorStop(0.9, colorWithAlpha(dark, 0.86)); g.addColorStop(1, colorWithAlpha(dark, 0));
          ctx.fillStyle = g;
          ctx.fillRect(0, cy - hh, W, hh * 2);
          // 縁の細い線（黒でも暗い背景で見えるよう、縁の色）
          const g2 = ctx.createLinearGradient(0, 0, W, 0);
          g2.addColorStop(0, colorWithAlpha(rim, 0)); g2.addColorStop(0.18, colorWithAlpha(rim, 0.85));
          g2.addColorStop(0.82, colorWithAlpha(rim, 0.85)); g2.addColorStop(1, colorWithAlpha(rim, 0));
          ctx.fillStyle = g2;
          const lw = Math.max(1.5, size * 0.014);
          ctx.fillRect(0, cy - hh - lw / 2, W, lw);
          ctx.fillRect(0, cy + hh - lw / 2, W, lw);
          ctx.restore();
        }
        // 牙：閉じる（だんだん速く）→ 噛み合ったまま一拍 → 開いて上下へ去る。噛んだ瞬間に全体が重く揺れる
        ctx.save();
        if (sc >= 0) {
          const sh = Math.exp(-sc * 10) * size * 0.05 * clamp(k, 0, 2);
          ctx.translate(noise1(d * 40, 3) * sh, noise1(d * 40, 9) * sh);
        }
        const closedGap = SS * 1.0;
        const away = SS * 2.3;
        let topY, botY, ta = 1;
        if (sc < 0) {
          const e1 = Math.pow(clamp(d / clap), 2.3);
          topY = -away + (cy - closedGap + away) * e1;
          botY = H + away - (H + away - (cy + closedGap)) * e1;
        } else {
          const u2 = EASE.outCubic(clamp((sc - 0.12) / 0.5));
          topY = cy - closedGap - (cy - closedGap + away) * u2;
          botY = cy + closedGap + (H + away - cy - closedGap) * u2;
          ta = 1 - EASE.inQuad(clamp((sc - 0.35) / 0.35));
        }
        if (ta > 0.01) {
          const o = { alpha: ta, fill, rim, shadow: '#000000', rimW: lum < 0.3 ? 0.018 : lum > 0.8 ? 0.032 : 0.022, shadowA: lum > 0.8 ? 0.9 : 0.6 };
          V.teethRow(ctx, cx, topY, SS, 1, o);
          V.teethRow(ctx, cx, botY, SS, -1, { ...o, lower: true });
        }
        ctx.restore();
        return;
      }
      // 手前：噛んだ瞬間の閃光と衝撃波
      if (sc >= 0 && sc < 0.2) {
        const flashCol = lum < 0.3 ? rim : fill;
        drawFlash(ctx, cx, cy, W * 0.38, flashCol, 0.75 * clamp(k) * Math.pow(1 - sc / 0.2, 2), 0.45);
      }
      if (sc >= 0 && sc < 0.55) {
        const q = sc / 0.55;
        const ringCol = lum < 0.3 ? rim : fill;
        const R1 = (bare ? SS * 0.5 : size * 0.5) + (bare ? SS * 4.2 : size * 4.2) * EASE.outCubic(q);
        const R2 = (bare ? SS * 0.3 : size * 0.3) + (bare ? SS * 2.8 : size * 2.8) * EASE.outCubic(q);
        // 明るい背景でも見えるよう、色の輪の下に暗い輪を敷く
        if (lum > 0.3) { shockRing(ctx, cx, cy, R1, ringW * (1 - q) * 1.9, '#000000', 0.3 * (1 - q)); shockRing(ctx, cx, cy, R2, ringW * 0.5 * (1 - q) * 1.9, '#000000', 0.22 * (1 - q)); }
        shockRing(ctx, cx, cy, R1, ringW * (1 - q), ringCol, 0.95 * (1 - q) * clamp(k));
        shockRing(ctx, cx, cy, R2, ringW * 0.5 * (1 - q), ringCol, 0.7 * (1 - q) * clamp(k));
      }
    }

    // 抜刀の一閃（戦闘演出）：文字も帯もない、斜めの一閃だけ。細くとがった光の線がごく速く（約0.1秒）画面を斜めに走り、
    // 斬った瞬間に線に沿った細長いやわらかい光がひらめき、細い残像の線がすぐに消える。火花や放射状の光は使わない（アニメの一閃のように簡素に）。
    // sfx.dir：'up'（左下から右上へ。抜刀の向き）/ 'down'（左上から右下）、sfx.cuts：'one'（1本）/ 'x'（Xの2本。2本目が0.12秒後に左右対称に交差し、交差点がやわらかく光る）
    drawKatanaFx(ctx, pg, page, t, scale, scene, sfx, k) {
      const d = t - pg.start;
      if (d < 0) return;
      const W = scene.width, H = scene.height;
      const glow = sfx.color || '#cfe6ff';
      const core = sfx.color2 || '#ffffff';
      const m = /#?([0-9a-f]{6})/i.exec(core);
      const n6 = m ? parseInt(m[1], 16) : 0xffffff;
      const lum = (((n6 >> 16) & 255) * 0.3 + ((n6 >> 8) & 255) * 0.59 + (n6 & 255) * 0.11) / 255;
      const mode = lum < 0.25 ? 'black' : lum > 0.8 ? 'white' : 'red';
      // 読みやすさのための細い縁（白：暗い影 / 黒：淡い光の縁 / 赤：なし）
      const under = mode === 'white' ? 'rgba(10,14,26,0.6)' : mode === 'black' ? 'rgba(232,238,250,0.8)' : null;
      const sgn = sfx.dir === 'down' ? -1 : 1;
      const SWEEP = 0.1, FADE = 0.55, T0 = 0.12;
      const isX = sfx.cuts === 'x';
      const cuts = [{ t: T0, ang: -0.62 * sgn }];
      if (isX) cuts.push({ t: T0 + 0.12, ang: 0.62 * sgn });
      const lastEnd = cuts[cuts.length - 1].t + SWEEP;
      const Lc = Math.hypot(W, H) * 0.4;
      const th = H * 0.026 * clamp(k, 0.3, 2);
      // 両端がとがった細い線。x0 から x1 へ、先（x1）にいくほど明るい
      const blade = (x0, x1, w, col, alpha, shadow, blur) => {
        if (alpha <= 0.002 || x1 - x0 <= 0.5 || w <= 0.05) return;
        ctx.save();
        ctx.globalAlpha *= clamp(alpha);
        if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = blur * scale; }
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, colorWithAlpha(col, 0));
        g.addColorStop(0.7, colorWithAlpha(col, 0.9));
        g.addColorStop(1, col);
        ctx.fillStyle = g;
        const mid = x0 + (x1 - x0) * 0.78;
        ctx.beginPath();
        ctx.moveTo(x0, 0); ctx.quadraticCurveTo(mid, -w, x1, 0); ctx.quadraticCurveTo(mid, w, x0, 0);
        ctx.fill();
        ctx.restore();
      };
      // 残像：中央がいちばん太く、両端が細く消える線
      const line = (w, col, alpha, shadow, blur) => {
        if (alpha <= 0.002 || w <= 0.05) return;
        ctx.save();
        ctx.globalAlpha *= clamp(alpha);
        if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = blur * scale; }
        const g = ctx.createLinearGradient(-Lc, 0, Lc, 0);
        g.addColorStop(0, colorWithAlpha(col, 0)); g.addColorStop(0.5, col); g.addColorStop(1, colorWithAlpha(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-Lc, 0); ctx.quadraticCurveTo(0, -w, Lc, 0); ctx.quadraticCurveTo(0, w, -Lc, 0);
        ctx.fill();
        ctx.restore();
      };
      const centre = mode === 'red' ? '#fff0f3' : mode === 'black' ? '#2a2d36' : '#ffffff';
      let sh = 0;
      cuts.forEach(c => { const a = d - c.t - SWEEP * 0.5; if (a >= 0) sh += Math.exp(-a * 20); });
      const amp = H * 0.004 * Math.min(1.5, sh) * clamp(k, 0, 2);
      ctx.save();
      ctx.translate(noise1(d * 50, 3) * amp, noise1(d * 50, 9) * amp);
      // 2本あるときは、残像は2本目が振り終わってからいっしょに薄れる
      const q = (d - lastEnd) / FADE;
      cuts.forEach(c => {
        const a = d - c.t;
        if (a < 0) return;
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(c.ang);
        if (a < SWEEP) {
          const head = -Lc + 2 * Lc * EASE.outQuad(a / SWEEP);
          const x0 = Math.max(-Lc, head - Lc * 1.2);
          if (under) blade(x0, head, th * 1.3, under, 0.9, null, 0);
          blade(x0, head, th, core, 1, glow, th * 0.8);
        } else if (q < 1) {
          const f = 1 - q;
          if (under) line(th * 1.0 * f, under, 0.8 * f, null, 0);
          line(th * 0.7 * f, core, f * f, glow, th * 0.7);
          line(H * 0.005 * f, centre, f, null, 0);
        }
        // 斬った瞬間：線に沿った細長いやわらかい光（ひらめいてすぐ消える）
        const fl = a - SWEEP * 0.5;
        if (fl >= 0 && fl < 0.26) drawFlash(ctx, 0, 0, W * 0.42, glow, 0.5 * clamp(k) * Math.pow(1 - fl / 0.26, 2), 0.07);
        ctx.restore();
      });
      // X：2本目が決まる瞬間、交差点がやわらかく光るだけ
      if (isX) {
        const g = d - (cuts[1].t + SWEEP * 0.5);
        if (g >= 0 && g < 0.28) drawFlash(ctx, W / 2, H / 2, H * 0.26, glow, 0.6 * clamp(k) * Math.pow(1 - g / 0.28, 2));
      }
      ctx.restore();
    }

    // 斬撃・ハード（戦闘演出 'zangeki-slash_hard'）：文字も帯もない、劇的な一閃。右上の画面の外から左下の終点まで、約0.25秒でまっすぐな実線がひと筆で引かれ（先端がとがり、中ほどから先がいちばん太い）、
    // 少し留まってから、尾から先へ向かってスパッと消える。先端が着いた瞬間、左下で大きな衝撃（鋭い星形の閃光・長く細い放射線・白い芯の閃光・2本の細い輪・太い放射状の速度線・短く強い揺れ・ごく薄い全画面の閃光）。
    // ぼかしや光のにじみはなく、くっきりした実線だけで描く（火花や破片なし）。sfx.dir：'dl'（右上から左下へ。既定）/ 'dr'（左右反転）。sfx.color：輪の色、sfx.color2：線と衝撃の色
    drawZangekiHard(ctx, pg, page, t, scale, scene, sfx, k) {
      const d = t - pg.start;
      if (d < 0) return;
      const W = scene.width, H = scene.height;
      const ringCol = sfx.color || '#cfe6ff';
      const core = sfx.color2 || '#ffffff';
      const m = /#?([0-9a-f]{6})/i.exec(core);
      const n6 = m ? parseInt(m[1], 16) : 0xffffff;
      const lum = (((n6 >> 16) & 255) * 0.3 + ((n6 >> 8) & 255) * 0.59 + (n6 & 255) * 0.11) / 255;
      const mode = lum < 0.25 ? 'black' : lum > 0.8 ? 'white' : 'red';
      const under = mode === 'white' ? 'rgba(10,14,26,0.7)' : mode === 'black' ? 'rgba(232,238,250,0.85)' : 'rgba(40,0,8,0.55)';
      const fillCol = mode === 'black' ? '#07080b' : core;
      const ringC = mode === 'white' ? ringCol : mode === 'black' ? '#07080b' : core;
      const discCol = mode === 'red' ? '#fff0f3' : mode === 'black' ? '#07080b' : '#ffffff';
      const flashCol = mode === 'black' ? '7, 8, 11' : mode === 'red' ? '255, 42, 64' : '255, 255, 255';
      const px1 = H / 720;
      const kk = clamp(k, 0.3, 2);
      const T0 = 0.08, TR = 0.25, HOLD = 0.2, WIPE = 0.3;
      const Ltot = Math.hypot(W, H) * 0.85;
      const th = H * 0.056 * kk;                         // いちばん太いところ（約40px）
      const ang = Math.PI - 0.513;                        // 振り下ろす向き（右上から左下）
      const ex = W * 0.19, ey = H * 0.76;                 // 衝撃の点（左下。画面の中に十分収める）
      const a = d - T0;
      if (a < 0) return;
      const ia = a - TR;                                  // 先端が着いてからの時間
      ctx.save();
      if (sfx.dir === 'dr') { ctx.translate(W, 0); ctx.scale(-1, 1); }
      // 全画面のごく薄い閃光（着いた瞬間の2コマ）
      if (ia >= 0 && ia < 0.085) {
        ctx.fillStyle = `rgba(${flashCol}, ${(0.16 * clamp(k, 0, 1.5) * (ia < 0.04 ? 1 : 0.6)).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
      // 短く強い揺れ（約0.15秒で収まる）
      const amp = ia >= 0 ? 5.5 * px1 * Math.pow(clamp(1 - ia / 0.17), 1.2) * clamp(k, 0, 2) : 0;
      ctx.translate(noise1(d * 60, 3) * amp, noise1(d * 60, 9) * amp);
      ctx.lineJoin = 'round';
      const poly = (pts, col, lw, al) => {
        ctx.globalAlpha = clamp(al);
        ctx.beginPath();
        pts.forEach(([x, y], i) => { if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.closePath();
        if (lw) { ctx.strokeStyle = under; ctx.lineWidth = lw; ctx.stroke(); }
        ctx.fillStyle = col; ctx.fill();
        ctx.globalAlpha = 1;
      };
      // --- 実線の一閃（原点＝衝撃の点、+x が斬る向き）---
      ctx.save();
      ctx.translate(ex, ey); ctx.rotate(ang);
      let x1 = 0, x0 = -Ltot, wk = 1, al = 1;
      if (a < TR) { const p = a / TR; x1 = -Ltot + Ltot * (1 - Math.pow(1 - p, 1.6)); }
      else {
        const wq = (ia - HOLD) / WIPE;
        if (wq >= 1) { x1 = x0 = 0; al = 0; }
        else if (wq > 0) { x0 = -Ltot + Ltot * Math.pow(wq, 1.25); wk = 1 - 0.4 * wq; al = 1 - clamp((wq - 0.85) / 0.15); }
      }
      if (al > 0.003 && x1 - x0 > 1) {
        const N = 56, bow = H * 0.014;
        const top = [], bot = [], midl = [];
        for (let i = 0; i <= N; i++) {
          const x = x0 + (x1 - x0) * i / N, u = clamp((x + Ltot) / Ltot);
          const prof = Math.pow(Math.sin(Math.PI / 2 * Math.min(1, u / 0.55)), 1.15);
          const ht = Math.pow(clamp((x1 - x) / (Ltot * 0.1)), 0.8);
          const tt = a >= TR + HOLD ? Math.pow(clamp((x - x0) / (Ltot * 0.07)), 0.9) : 1;
          const w = th * wk * Math.max(prof, 0.03) * ht * tt, yc = -bow * Math.sin(Math.PI * u);
          top.push([x, yc - w / 2]); bot.push([x, yc + w / 2]);
          midl.push([x, yc, w]);
        }
        poly(top.concat(bot.reverse()), fillCol, 2.6 * px1, al);
        if (mode === 'red') {
          const t2 = midl.map(([x, y, w]) => [x, y - w * 0.06]).concat(midl.slice().reverse().map(([x, y, w]) => [x, y + w * 0.06]));
          poly(t2, '#fff0f3', 0, al);
        }
      }
      ctx.restore();
      // --- 大きな衝撃（終点）---
      if (ia >= 0) {
        ctx.save();
        ctx.translate(ex, ey);
        const grow = EASE.outExpo(clamp(ia / 0.07));
        const decayOut = clamp((ia - 0.28) / 0.34);           // 外側から内側へ縮んで消える
        const aStar = 1 - EASE.inOutCubic(clamp((ia - 0.34) / 0.3));
        const ray = (th0, r0, r1, hw, col, alpha) => {
          const c = Math.cos(th0), s = Math.sin(th0);
          poly([[c * r0 - s * hw, s * r0 + c * hw], [c * r1, s * r1], [c * r0 + s * hw, s * r0 - c * hw]], col, 2.2 * px1, alpha);
        };
        // 細い輪2本（速いものとゆっくりなもの）
        [[0.2, 0.17, 5.5], [0.45, 0.125, 3.2]].forEach(([dur, rad, wd], i) => {
          const q = ia / dur;
          if (q >= 1) return;
          const rr = H * rad * kk * (i ? EASE.outQuad(q) : EASE.outExpo(q)) + H * 0.02;
          ctx.globalAlpha = clamp((1 - q) * 1.2 * clamp(k, 0, 1.5));
          ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU);
          const lw = (wd * (1 - q) + 1) * px1;
          ctx.strokeStyle = under; ctx.lineWidth = lw + 2.2 * px1; ctx.stroke();
          ctx.strokeStyle = ringC; ctx.lineWidth = lw; ctx.stroke();
          ctx.globalAlpha = 1;
        });
        // 太い放射状の速度線：外へ飛び出して縮む
        [[8, 1], [-22, 0.85], [42, 0.9], [-58, 0.75], [150, 0.7], [-148, 0.65]].forEach(([deg, len], i) => {
          const q = ia / 0.42;
          if (q >= 1) return;
          const th0 = ang + deg * Math.PI / 180 + (rnd(11, i, 1) - 0.5) * 0.1;
          const r0 = H * (0.075 + 0.1 * EASE.outExpo(clamp(ia / 0.18))) * kk;
          const r1 = r0 + H * 0.075 * len * kk * (1 - EASE.inQuad(q));
          ray(th0, r0, r1, H * 0.0095 * (1 - q * 0.6), fillCol, 1 - EASE.inQuad(q));
        });
        // 長く細い放射線：長短を交互に。前（斬った向き）に長く、まわりに扇状。外側から縮んで消える
        const rays = [[0, 1], [18, 0.5], [-18, 0.5], [38, 0.85], [-38, 0.85], [62, 0.45], [-62, 0.45], [90, 0.7], [-90, 0.7], [125, 0.4], [-125, 0.4], [180, 0.6]];
        const Rs = H * 0.1 * kk;
        if (aStar > 0.003) {
          rays.forEach(([deg, len], i) => {
            const th0 = ang + deg * Math.PI / 180 + (rnd(7, i, 1) - 0.5) * 0.1;
            const r0 = Rs * 0.7;
            const lenNow = H * 0.205 * kk * len * grow * (1 - 0.75 * EASE.inQuad(decayOut) * (1 - 0.3 * len));
            ray(th0, r0, r0 + lenNow, H * 0.0095 * (0.5 + 0.5 * len), fillCol, aStar);
          });
          // 鋭い星形：10点、長短を交互に
          const sc = grow * (1 - 0.5 * EASE.inQuad(decayOut));
          ctx.beginPath();
          for (let j = 0; j < 20; j++) {
            const rad = j % 2 ? Rs * 0.33 * sc : Rs * (j % 4 === 0 ? 1 : 0.62) * sc;
            const an = ang + j * Math.PI / 10;
            if (j) ctx.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); else ctx.moveTo(Math.cos(an) * rad, Math.sin(an) * rad);
          }
          ctx.closePath();
          ctx.globalAlpha = clamp(aStar);
          ctx.strokeStyle = under; ctx.lineWidth = 2.6 * px1; ctx.stroke();
          ctx.fillStyle = fillCol; ctx.fill();
          ctx.globalAlpha = 1;
        }
        // 白い芯の閃光：不透明な円がすぐに縮み、いちばん最後に消える
        const rc = H * (0.03 + 0.055 * Math.exp(-ia * 13)) * kk * (1 - 0.35 * clamp((ia - 0.5) / 0.4));
        const ac = 1 - EASE.inOutCubic(clamp((ia - 0.5) / 0.45));
        if (ac > 0.003) {
          ctx.globalAlpha = clamp(ac);
          ctx.beginPath(); ctx.arc(0, 0, rc, 0, TAU);
          ctx.strokeStyle = under; ctx.lineWidth = 2.4 * px1; ctx.stroke();
          ctx.fillStyle = discCol; ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
      ctx.restore();
    }

    // 弾痕（戦闘演出）：弾痕のパターンを選べる構造。sfx.pattern：'glass'（ガラスの弾痕 = 'bullet-glass'。いまはこれだけ。あとで生き物向けの 'flesh' などを足せる）。
    // sfx.count（'1'・'2'・'3'：発数）で配置を決め、sfx.holes（[{ x, y, size, seed, t }]。画面の割合・穴の大きさ（高さに対する割合）・形のseed・当たる時刻）で好きな配置にもできる。
    // 全部の穴は最後の1発が当たってから約2秒そのまま残り、いっしょに消える。
    drawBulletMark(ctx, pg, page, t, scale, scene, sfx, k) {
      const d = t - pg.start;
      if (d < 0) return;
      const holes = this.bulletLayout(sfx);
      const last = holes.reduce((m, h) => Math.max(m, h.t), 0);
      const fs = last + 0.2 + 2.0;   // 最後の1発が決まってから約2秒残して消え始める
      const fade = {
        A: 1 - EASE.inOutCubic(clamp((d - fs) / 0.35)),        // 破片・ひび・光の筋
        G: 1 - EASE.inOutCubic(clamp((d - fs - 0.1) / 0.35)),  // 光
        H: 1 - EASE.inOutCubic(clamp((d - fs - 0.2) / 0.35))   // 穴
      };
      if (fade.H <= 0.003) return;
      holes.forEach(h => {
        const a = d - h.t;
        if (a < 0) return;
        // パターン：'glass'（既定）と 'crack'（実線のひび）
        if (sfx.pattern === 'crack') this.drawBulletCrack(ctx, scene, sfx, h, a, fade, scale, k);
        else this.drawBulletGlass(ctx, scene, sfx, h, a, fade, scale, k);
      });
    }

    // 弾痕の配置：発数ごとの既定の配置（画面の割合）。穴は画面の中に十分収め、長いひびだけが枠から出てもよい
    bulletLayout(sfx) {
      if (Array.isArray(sfx.holes) && sfx.holes.length) {
        return sfx.holes.map((h, i) => ({ x: Number(h.x ?? 0.5), y: Number(h.y ?? 0.5), size: Number(h.size) > 0 ? Number(h.size) : 0.095, seed: parseInt(h.seed, 10) || (i + 1), t: Number.isFinite(Number(h.t)) ? Number(h.t) : 0.12 + i * 0.14 }));
      }
      const n = Math.min(3, Math.max(1, parseInt(sfx.count, 10) || 1));
      const baseSize = Number(sfx.size) > 0 ? Number(sfx.size) : 0.095;
      const baseSeed = parseInt(sfx.seed, 10) || 1;
      const px = Number.isFinite(Number(sfx.x)) && sfx.x !== '' && sfx.x !== undefined ? Number(sfx.x) : 0.5;
      const py = Number.isFinite(Number(sfx.y)) && sfx.y !== '' && sfx.y !== undefined ? Number(sfx.y) : 0.5;
      // [中心からのずれ x, y（画面の割合）, 穴の大きさの割合]
      const spots = {
        1: [[0, 0, 1]],
        2: [[-0.07, 0.07, 1], [0.15, -0.08, 0.85]],           // 左下の大きい穴のあと、右上の小さい穴（参考画像のように）
        3: [[-0.14, -0.14, 1], [0.14, -0.02, 0.85], [-0.05, 0.2, 0.92]]
      }[n];
      return spots.map(([dx, dy, rel], i) => ({ x: px + dx, y: py + dy, size: baseSize * rel, seed: baseSeed + i, t: 0.12 + i * 0.14 }));
    }

    // ガラスの弾痕（'bullet-glass'）：穴の芯（黒い穴と光る縁）・放射状のひび・ガラスだけの層（光・光の筋・破片・輪の割れ目）に分けてある。
    // ガラスだけの層は glassFx で切り替えられ、別のパターン（生き物向けなど）ではこの層を減らしたり置き換えたりできる
    drawBulletGlass(ctx, scene, sfx, shot, a, fade, scale, k) {
      const W = scene.width, H = scene.height;
      const fA = fade.A, fG = fade.G, fH = fade.H;
      const glassFx = (sfx.pattern || 'glass') === 'glass';
      const seed = 100 + shot.seed * 37;
      const amt = { few: 0, 3: 0, mid: 1, 4: 1, many: 2 }[String(sfx.cracks)] ?? 1;
      const nRad = [8, 10, 12][amt], nShard = [24, 32, 40][amt], nRay = [4, 5, 6][amt];
      const D = H * shot.size;
      const r = D / 2;
      const cx = W * shot.x, cy = H * shot.y;
      const rimCol = sfx.color || '#f6f6f2';
      const holeCol = sfx.color2 || '#07080b';
      const m = /#?([0-9a-f]{6})/i.exec(rimCol);
      const n6 = m ? parseInt(m[1], 16) : 0xffffff;
      const cr = (n6 >> 16) & 255, cg = (n6 >> 8) & 255, cb = n6 & 255;
      const rgba = (al) => `rgba(${cr}, ${cg}, ${cb}, ${clamp(al).toFixed(3)})`;
      const under = 'rgba(0,0,0,0.38)';
      const R = (i, q) => rnd(seed, i, q);
      const base = R(0, 1) * TAU;
      const RMAX = r * 4.3;
      const lead = EASE.outExpo(clamp((a - 0.0) / 0.15));      // ひび・筋ののび
      ctx.save();
      ctx.translate(cx, cy);

      // 1) 穴のうしろのやわらかい白い光（控えめ）【ガラスの層】
      if (glassFx) {
        const ga = 0.32 * fG * clamp(a / 0.1);
        const g = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 4.2);
        g.addColorStop(0, rgba(ga * 1.4)); g.addColorStop(0.3, rgba(ga * 0.55)); g.addColorStop(1, rgba(0));
        ctx.fillStyle = g;
        ctx.fillRect(-r * 4.3, -r * 4.3, r * 8.6, r * 8.6);
      }
      // 2) 光の筋：先へいくほど消える細いくさび
      const rayBase = R(1, 2) * TAU;
      for (let q = 0; glassFx && q < nRay; q++) {
        const th = rayBase + q * TAU / nRay + (R(q, 3) - 0.5) * 0.5;
        const L = r * (4 + 4.5 * R(q, 4)) * lead;
        if (L < r * 1.2) continue;
        const hw = r * (0.2 + 0.18 * R(q, 5));
        const ux = Math.cos(th), uy = Math.sin(th);
        const x0 = ux * r * 1.05, y0 = uy * r * 1.05;
        const g = ctx.createLinearGradient(x0, y0, ux * L, uy * L);
        g.addColorStop(0, rgba(0.5 * fA)); g.addColorStop(0.5, rgba(0.14 * fA)); g.addColorStop(1, rgba(0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0 - uy * hw, y0 + ux * hw); ctx.lineTo(ux * L, uy * L); ctx.lineTo(x0 + uy * hw, y0 - ux * hw);
        ctx.closePath(); ctx.fill();
      }
      // 3) 破片：2つの帯。内側ほど放射状のくさび、外側は細い破片。内側から外側へ順に出る
      const shards = [];
      for (let z = 0; glassFx && z < 2; z++) {
        const n = z === 0 ? Math.round(nShard * 0.5) : nShard - Math.round(nShard * 0.5);
        for (let q = 0; q < n; q++) {
          const id = z * 100 + q;
          const th = base + (q + 0.6 * R(id, 6)) / n * TAU;
          const wd = TAU / n * (z === 0 ? 0.9 + 0.7 * R(id, 7) : 0.55 + 0.5 * R(id, 7));
          const ri = r * (z === 0 ? 1.12 + 0.35 * R(id, 8) : 1.9 + 0.8 * R(id, 8));
          const ro = ri + r * (z === 0 ? 0.5 + 0.8 * R(id, 9) : 0.8 + 1.2 * R(id, 9));
          const sk = (R(id, 10) - 0.5) * wd * 0.6;
          const pts = [[ri, th - wd * 0.28], [ri * 0.99, th + wd * 0.28], [ro, th + wd * 0.5 + sk]];
          if (R(id, 11) > 0.35) pts.push([ro * (0.92 + 0.14 * R(id, 12)), th - wd * 0.5 + sk]);
          shards.push({ pts, ri, delay: 0.03 + 0.12 * (ri - r) / (RMAX - r) + 0.012 * R(id, 13) });
        }
      }
      shards.sort((p, q) => q.ri - p.ri);
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'round';
      shards.forEach(sh => {
        const e = clamp((a - sh.delay) / 0.07);
        if (e <= 0) return;
        const fall = clamp(1.05 - (sh.ri - r) / (RMAX - r) * 0.8, 0.22, 1);
        const sc = 0.85 + 0.15 * EASE.outCubic(e);
        ctx.beginPath();
        sh.pts.forEach(([rad, th], j) => { const x = Math.cos(th) * rad * sc, y = Math.sin(th) * rad * sc; if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.closePath();
        const al = fA * e;
        ctx.fillStyle = rgba(0.2 * fall * fall * al + 0.04 * al);
        ctx.fill();
        ctx.strokeStyle = under; ctx.globalAlpha = al; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.strokeStyle = rgba(0.95 * fall); ctx.lineWidth = 1.3; ctx.stroke();
        ctx.globalAlpha = 1;
      });
      // 4) 輪の割れ目：放射状のひびをつなぐ細い弧
      const ringT = clamp((a - 0.1) / 0.1);
      if (glassFx && ringT > 0) {
        for (let q = 0; q < 4; q++) {
          const rad = r * (1.7 + 1.7 * R(q, 20));
          const th0 = base + R(q, 21) * TAU, span = (0.5 + 0.6 * R(q, 22)) * ringT;
          ctx.beginPath();
          for (let j = 0; j <= 8; j++) {
            const th = th0 + span * j / 8, rr = rad * (1 + (R(q * 9 + j, 23) - 0.5) * 0.1);
            const x = Math.cos(th) * rr, y = Math.sin(th) * rr;
            if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.globalAlpha = fA * 0.7;
          ctx.strokeStyle = under; ctx.lineWidth = 2.4; ctx.stroke();
          ctx.strokeStyle = rgba(0.85); ctx.lineWidth = 1.1; ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      // 5) 放射状のひび：細く先細り。4本ほどは長く（破片の帯の3倍ほど）、先端が先頭になってのびる
      const ribbon = (pts, w0, p) => {
        const cum = [0];
        for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
        const total = cum[cum.length - 1], reach = total * p;
        let P = pts;
        for (let j = 1; j < pts.length; j++) {
          if (cum[j] > reach) {
            const u = (reach - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]);
            P = pts.slice(0, j).concat([[pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u]]);
            break;
          }
        }
        if (P.length < 2) return;
        const Lp = [], Rp = [];
        let acc = 0;
        for (let j = 0; j < P.length; j++) {
          if (j) acc += Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]);
          const pa = P[Math.max(0, j - 1)], pb = P[Math.min(P.length - 1, j + 1)];
          const tx = pb[0] - pa[0], ty = pb[1] - pa[1], tl = Math.hypot(tx, ty) || 1;
          const w = w0 * Math.pow(Math.max(0, 1 - acc / total), 0.85) * (p < 1 ? Math.min(1, (reach - acc) / (total * 0.1) + 0.02) : 1);
          Lp.push([P[j][0] - ty / tl * w, P[j][1] + tx / tl * w]); Rp.push([P[j][0] + ty / tl * w, P[j][1] - tx / tl * w]);
        }
        ctx.beginPath();
        ctx.moveTo(Lp[0][0], Lp[0][1]);
        Lp.forEach(q => ctx.lineTo(q[0], q[1]));
        for (let j = Rp.length - 1; j >= 0; j--) ctx.lineTo(Rp[j][0], Rp[j][1]);
        ctx.closePath();
        ctx.globalAlpha = fA;
        ctx.strokeStyle = under; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = rgba(0.97); ctx.fill();
        ctx.globalAlpha = 1;
      };
      const rbase = R(2, 30) * TAU;
      for (let q = 0; q < nRad; q++) {
        const th = rbase + q * TAU / nRad + (R(q, 31) - 0.5) * 0.42;
        const long = q % Math.max(2, Math.round(nRad / 4)) === 0;
        const len = r * (long ? 5.2 + 2.6 * R(q, 32) : 2.4 + 2.0 * R(q, 32));
        const st = a - q * 0.006;
        if (st <= 0) continue;
        const p = EASE.outExpo(clamp(st / 0.15));
        let x = Math.cos(th) * r * 0.98, y = Math.sin(th) * r * 0.98, an = th;
        const pts = [[x, y]];
        for (let j = 1; j <= 9; j++) {
          an += (R(q * 11 + j, 33) - 0.5) * 0.2;
          x += Math.cos(an) * len / 9; y += Math.sin(an) * len / 9;
          pts.push([x, y]);
        }
        ribbon(pts, Math.max(0.9, r * (long ? 0.055 : 0.042)), p);
      }
      // 6) 当たった瞬間の細い輪
      if (a < 0.14) {
        const q = a / 0.14;
        ctx.save();
        ctx.globalAlpha *= 0.85 * (1 - q) * clamp(k, 0, 1.5);
        const rr = r * (1.4 + 3.6 * EASE.outCubic(q));
        ctx.lineWidth = Math.max(1.5, r * 0.07) + 2.2; ctx.strokeStyle = under;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
        ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.strokeStyle = rimCol;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      // 7) 穴：ほぼ黒い、ほんの少しいびつな丸。縁はくっきり細く明るく、そのまわりにやわらかい光の輪
      const pop = 1 + 0.25 * (1 - EASE.outQuad(clamp(a / 0.125)));
      ctx.scale(pop, pop);
      const NP = 36;
      const hole = new Path2D();
      for (let j = 0; j < NP; j++) {
        const th = j / NP * TAU;
        const rad = r * (1 + 0.05 * noise1(j * 0.6 + R(0, 7) * 9, seed) + (R(j, 8) - 0.5) * 0.035);
        const px = Math.cos(th) * rad, py = Math.sin(th) * rad;
        if (j) hole.lineTo(px, py); else hole.moveTo(px, py);
      }
      hole.closePath();
      ctx.save();
      ctx.globalAlpha *= clamp(fH);
      const gl = ctx.createRadialGradient(0, 0, r * 0.82, 0, 0, r * 1.7);
      gl.addColorStop(0, rgba(0.7)); gl.addColorStop(0.3, rgba(0.28)); gl.addColorStop(1, rgba(0));
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, TAU); ctx.fill();
      ctx.fillStyle = holeCol;
      ctx.fill(hole);
      // 内側のやわらかい光の輪
      const gi = ctx.createRadialGradient(0, 0, r * 0.66, 0, 0, r);
      gi.addColorStop(0, rgba(0)); gi.addColorStop(1, rgba(0.3));
      ctx.save(); ctx.clip(hole); ctx.fillStyle = gi; ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4); ctx.restore();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = under; ctx.lineWidth = Math.max(1.8, r * 0.08) + 2.2; ctx.stroke(hole);
      ctx.strokeStyle = rimCol; ctx.lineWidth = Math.max(1.6, r * 0.08);
      ctx.shadowColor = rgba(0.9); ctx.shadowBlur = r * 0.5 * scale;
      ctx.stroke(hole);
      // 縁の光が穴の中へにじんで穴が灰色にならないよう、中を黒く塗り直す
      ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0;
      ctx.save(); ctx.scale(0.9, 0.9); ctx.fillStyle = holeCol; ctx.fill(hole); ctx.restore();
      ctx.restore();
      ctx.restore();
    }

    // ひびの弾痕（'bullet-crack'：壁・床・木・コンクリートなど硬い面向け）：ガラスの弾痕と同じ構造（同じseedなら同じ形：放射状のひび・破片の2つの帯・輪の割れ目・同じ大きさの穴）を、
    // 塗り・グラデーション・光の筋・光のにじみなしの「くっきりした実線の輪郭」だけで描く。放射状のひびは太めの先細りの実線、破片は細い輪郭線（網目）。
    // 順番：穴がぽんと出る → 輪 → 放射状のひびが先端から一気にのびる → 破片の輪郭が穴から外へ順に描かれる → 約2秒そのまま → 破片の輪郭、ひび、穴の順に消える
    drawBulletCrack(ctx, scene, sfx, shot, a, fade, scale, k) {
      const W = scene.width, H = scene.height;
      const fS = fade.A, fC = fade.G, fH = fade.H;
      const seed = 100 + shot.seed * 37;     // ガラスと同じ seed → 同じ形
      const amt = { few: 0, 3: 0, mid: 1, 4: 1, many: 2 }[String(sfx.cracks)] ?? 1;
      const nRad = [8, 10, 12][amt], nShard = [24, 32, 40][amt];
      const r = H * shot.size / 2;
      const px1 = H / 720;
      const rimCol = sfx.color || '#f6f6f2';
      const holeCol = sfx.color2 || '#07080b';
      const m = /#?([0-9a-f]{6})/i.exec(rimCol);
      const n6 = m ? parseInt(m[1], 16) : 0xffffff;
      const cr = (n6 >> 16) & 255, cg = (n6 >> 8) & 255, cb = n6 & 255;
      const rgba = (al) => `rgba(${cr}, ${cg}, ${cb}, ${clamp(al).toFixed(3)})`;
      const under = 'rgba(0,0,0,0.5)';
      const R = (i, q) => rnd(seed, i, q);
      const base = R(0, 1) * TAU;
      const RMAX = r * 4.3;
      ctx.save();
      ctx.translate(shot.x * W, shot.y * H);
      ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
      // 1) 破片の輪郭：2つの帯（内側は放射状のくさび、外側は細い破片）。塗りなし。穴から外へ順に、輪郭が描かれるように現れる
      const shards = [];
      for (let z = 0; z < 2; z++) {
        const n = z === 0 ? Math.round(nShard * 0.5) : nShard - Math.round(nShard * 0.5);
        for (let q = 0; q < n; q++) {
          const id = z * 100 + q;
          const th = base + (q + 0.6 * R(id, 6)) / n * TAU;
          const wd = TAU / n * (z === 0 ? 0.9 + 0.7 * R(id, 7) : 0.55 + 0.5 * R(id, 7));
          const ri = r * (z === 0 ? 1.12 + 0.35 * R(id, 8) : 1.9 + 0.8 * R(id, 8));
          const ro = ri + r * (z === 0 ? 0.5 + 0.8 * R(id, 9) : 0.8 + 1.2 * R(id, 9));
          const sk = (R(id, 10) - 0.5) * wd * 0.6;
          const pts = [[ri, th - wd * 0.28], [ri * 0.99, th + wd * 0.28], [ro, th + wd * 0.5 + sk]];
          if (R(id, 11) > 0.35) pts.push([ro * (0.92 + 0.14 * R(id, 12)), th - wd * 0.5 + sk]);
          shards.push({ pts: pts.map(([rad, t]) => [Math.cos(t) * rad, Math.sin(t) * rad]), ri, delay: 0.1 + 0.2 * (ri - r) / (RMAX - r) + 0.012 * R(id, 13) });
        }
      }
      shards.sort((p, q) => q.ri - p.ri);
      shards.forEach(sh => {
        const e = clamp((a - sh.delay) / 0.1);
        if (e <= 0) return;
        const near = clamp(1 - (sh.ri - r) / (RMAX - r) * 0.9);
        const P = sh.pts, n = P.length;
        let per = 0;
        for (let j = 0; j < n; j++) { const b = P[(j + 1) % n]; per += Math.hypot(b[0] - P[j][0], b[1] - P[j][1]); }
        ctx.beginPath();
        P.forEach(([x, y], j) => { if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.closePath();
        ctx.setLineDash(e < 1 ? [per * EASE.outCubic(e), per * 2] : []);
        ctx.globalAlpha = fS;
        ctx.strokeStyle = under; ctx.lineWidth = (1.3 + 0.4 * near) * px1 + 1.6; ctx.stroke();
        ctx.strokeStyle = rgba(0.7 + 0.3 * near); ctx.lineWidth = (1.3 + 0.4 * near) * px1; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      });
      // 2) 輪の割れ目：放射状のひびをつなぐ細い弧（実線）
      const ringT = clamp((a - 0.12) / 0.12);
      if (ringT > 0) {
        for (let q = 0; q < 4; q++) {
          const rad = r * (1.7 + 1.7 * R(q, 20));
          const th0 = base + R(q, 21) * TAU, span = (0.5 + 0.6 * R(q, 22)) * ringT;
          ctx.beginPath();
          for (let j = 0; j <= 8; j++) {
            const th = th0 + span * j / 8, rr = rad * (1 + (R(q * 9 + j, 23) - 0.5) * 0.1);
            const x = Math.cos(th) * rr, y = Math.sin(th) * rr;
            if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.globalAlpha = fC;
          ctx.strokeStyle = under; ctx.lineWidth = 1.5 * px1 + 1.6; ctx.stroke();
          ctx.strokeStyle = rgba(0.95); ctx.lineWidth = 1.5 * px1; ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      // 3) 放射状のひび：太めの先細りの実線。先端が先頭になって一気にのびる。2〜3本は長い
      const ribbon = (pts, w0, p) => {
        const cum = [0];
        for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
        const total = cum[cum.length - 1], reach = total * p;
        let P = pts;
        for (let j = 1; j < pts.length; j++) {
          if (cum[j] > reach) {
            const u = (reach - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]);
            P = pts.slice(0, j).concat([[pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u]]);
            break;
          }
        }
        if (P.length < 2) return;
        const Lp = [], Rp = [];
        let acc = 0;
        for (let j = 0; j < P.length; j++) {
          if (j) acc += Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]);
          const pa = P[Math.max(0, j - 1)], pb = P[Math.min(P.length - 1, j + 1)];
          const tx = pb[0] - pa[0], ty = pb[1] - pa[1], tl = Math.hypot(tx, ty) || 1;
          const w = w0 * Math.pow(Math.max(0, 1 - acc / total), 0.85) * (p < 1 ? Math.min(1, (reach - acc) / (total * 0.1) + 0.02) : 1);
          Lp.push([P[j][0] - ty / tl * w, P[j][1] + tx / tl * w]); Rp.push([P[j][0] + ty / tl * w, P[j][1] - tx / tl * w]);
        }
        ctx.beginPath();
        ctx.moveTo(Lp[0][0], Lp[0][1]);
        Lp.forEach(q => ctx.lineTo(q[0], q[1]));
        for (let j = Rp.length - 1; j >= 0; j--) ctx.lineTo(Rp[j][0], Rp[j][1]);
        ctx.closePath();
        ctx.globalAlpha = fC;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = under; ctx.lineWidth = 2.2 * px1; ctx.stroke();
        ctx.fillStyle = rgba(1); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineJoin = 'miter';
      };
      const rbase = R(2, 30) * TAU;
      for (let q = 0; q < nRad; q++) {
        const th = rbase + q * TAU / nRad + (R(q, 31) - 0.5) * 0.42;
        const long = q % Math.max(2, Math.round(nRad / 4)) === 0;
        const len = r * (long ? 5.2 + 2.6 * R(q, 32) : 2.4 + 2.0 * R(q, 32));
        const st = a - q * 0.006;
        if (st <= 0) continue;
        const p = EASE.outExpo(clamp(st / 0.15));
        let x = Math.cos(th) * r * 0.98, y = Math.sin(th) * r * 0.98, an = th;
        const pts = [[x, y]];
        for (let j = 1; j <= 9; j++) {
          an += (R(q * 11 + j, 33) - 0.5) * 0.2;
          x += Math.cos(an) * len / 9; y += Math.sin(an) * len / 9;
          pts.push([x, y]);
        }
        ribbon(pts, (long ? 2.0 : 1.7) * px1, p);
      }
      // 4) 当たった瞬間の細い輪（実線）
      if (a < 0.14) {
        const q = a / 0.14;
        ctx.globalAlpha = 0.85 * (1 - q) * clamp(k, 0, 1.5);
        const rr = r * (1.4 + 3.6 * EASE.outCubic(q));
        ctx.lineWidth = 1.6 * px1 + 1.8; ctx.strokeStyle = under;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
        ctx.lineWidth = 1.6 * px1; ctx.strokeStyle = rgba(1);
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // 5) 穴：ガラスと同じ大きさ・形。ほぼ黒で、細くくっきりした縁だけ（光のにじみなし）
      const pop = 1 + 0.25 * (1 - EASE.outQuad(clamp(a / 0.125)));
      ctx.scale(pop, pop);
      const NP = 36;
      const hole = new Path2D();
      for (let j = 0; j < NP; j++) {
        const th = j / NP * TAU;
        const rad = r * (1 + 0.05 * noise1(j * 0.6 + R(0, 7) * 9, seed) + (R(j, 8) - 0.5) * 0.035);
        const x = Math.cos(th) * rad, y = Math.sin(th) * rad;
        if (j) hole.lineTo(x, y); else hole.moveTo(x, y);
      }
      hole.closePath();
      ctx.globalAlpha = clamp(fH);
      ctx.lineJoin = 'round';
      ctx.fillStyle = holeCol; ctx.fill(hole);
      ctx.strokeStyle = under; ctx.lineWidth = 1.8 * px1 + 1.8; ctx.stroke(hole);
      ctx.strokeStyle = rgba(1); ctx.lineWidth = 1.8 * px1; ctx.stroke(hole);
      ctx.fillStyle = holeCol; ctx.save(); ctx.scale(0.93, 0.93); ctx.fill(hole); ctx.restore();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // 爪痕（戦闘演出）：4本の爪痕が右上から左下へ、1本ずつ素早く引っかかれる。曲がった長い刃のような形で、先は針、後ろは長い尾。
    // 絵の具のかすれのように、筋（刷毛目）・小さな穴・ちぎれた縁・縁の外へ散る細かい粒でできている（輪郭線やとげの形は使わない）。
    // 形は1回だけ画素ごとに作って、引っかく順に頭から尾へ（荒い縁で）現し、最後は縁の粒と細い筋から先に崩れて消える。sfx.dir === 'lr' で左右反転
    drawClawMark(ctx, pg, page, t, scale, scene, sfx, k) {
      const d = t - pg.start;
      if (d < 0) return;
      const W = scene.width, H = scene.height;
      const fill = sfx.color || '#f7f3ea';
      const rim = sfx.color2 || '#4d493f';
      const m = /#?([0-9a-f]{6})/i.exec(fill);
      const n6 = m ? parseInt(m[1], 16) : 0xffffff;
      const cr = (n6 >> 16) & 255, cg = (n6 >> 8) & 255, cb = n6 & 255;
      const SWEEP = 0.17, STAG = 0.065, T0 = 0.1, HOLD = 0.62, FADE = 1.05;
      const claw = this.clawMasks(W, H, 4100 + pg.index * 7);
      const tEnd = T0 + 3 * STAG + SWEEP + HOLD;
      const fadeP = clamp((d - tEnd) / FADE);
      if (fadeP >= 1) return;
      const startOf = i => T0 + claw.order.indexOf(i) * STAG;
      const flip = sfx.dir === 'lr' ? -1 : 1;
      let sh = 0;
      for (let i = 0; i < 4; i++) { const a = d - startOf(i); if (a >= 0) sh += Math.exp(-a * 16); }
      const amp = H * 0.007 * Math.min(1.5, sh) * clamp(k, 0, 2);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(flip, 1);
      ctx.translate(noise1(d * 45, 3) * amp, noise1(d * 45, 9) * amp);
      ctx.shadowColor = colorWithAlpha(rim, 0.95);
      claw.strokes.forEach((st, i) => {
        const t0 = startOf(i);
        const p = clamp((d - t0) / SWEEP);
        if (p <= 0) return;
        const rev = EASE.outQuad(p) * 1.16;
        const fl = (d - t0 - SWEEP) / 0.15;
        const flash = fl >= 0 && fl < 1 ? 0.7 * (1 - fl) : 0;
        const key = Math.round(rev * 200) + '|' + Math.round(fadeP * 300) + '|' + Math.round(flash * 50) + '|' + n6;
        if (st.key !== key) {
          st.key = key;
          const { A, S, F, R, w, h, id } = st;
          const out = id.data;
          const fr = flash, rr = cr + (255 - cr) * fr, gg = cg + (255 - cg) * fr, bb = cb + (255 - cb) * fr;
          for (let q = 0, n = w * h; q < n; q++) {
            const a0 = A[q];
            let a = 0;
            if (a0) {
              const rv = clamp((rev - S[q]) / 0.035);
              if (rv > 0) {
                // 薄れ方：縁の粒と細い筋（F が大きい）から先に、本体は最後に、ばらつきをつけて崩れる
                const life = 0.08 + 0.62 * (1 - F[q] / 255) + 0.3 * (R[q] / 255);
                const lv = fadeP <= 0 ? 1 : clamp((life - fadeP) / 0.1);
                a = a0 * rv * lv;
              }
            }
            const o = q * 4;
            out[o] = rr; out[o + 1] = gg; out[o + 2] = bb; out[o + 3] = a;
          }
          st.cx.putImageData(id, 0, 0);
        }
        // 読みやすさのため、やわらかい影（黒は淡い光）を2段重ねる：まわりの広いぼかし＋ふちの近くの濃いぼかし
        ctx.shadowBlur = H * 0.016 * scale;
        ctx.drawImage(st.cv, st.x0, st.y0);
        ctx.shadowBlur = H * 0.005 * scale;
        ctx.drawImage(st.cv, st.x0, st.y0);
      });
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowBlur = 0;
      // 引っかく先端の光と、進行方向へ飛ぶ細かい粒
      const seedBase = 4100 + pg.index * 7;
      claw.strokes.forEach((st, i) => {
        const t0 = startOf(i);
        const dt = d - t0;
        if (dt < 0 || dt > 1.0) return;
        const p = clamp(dt / SWEEP);
        if (p < 1) { const [hx, hy] = claw.centre(i, EASE.outQuad(p)); drawFlash(ctx, hx, hy, H * 0.15, rim, 0.4 * clamp(k), 0.8); }
        const seed = seedBase + i * 31;
        ctx.fillStyle = fill;
        for (let r = 0; r < 34; r++) {
          const sc = 0.08 + 0.85 * rnd(seed, r, 61);
          const a = dt - SWEEP * sc;
          const life = 0.3 + 0.35 * rnd(seed, r, 62);
          if (a < 0 || a > life) continue;
          const [x, y] = claw.centre(i, sc);
          const v = H * (0.5 + 1.0 * rnd(seed, r, 63));
          const dist = v * (1 - Math.exp(-5 * a)) / 5;
          const sp = (rnd(seed, r, 64) - 0.5) * 0.8;
          const dx = claw.ux * Math.cos(sp) - claw.uy * Math.sin(sp), dy = claw.uy * Math.cos(sp) + claw.ux * Math.sin(sp);
          const lat = (rnd(seed, r, 66) - 0.5) * claw.wmaxOf(i) * 1.4;
          const rad = Math.max(0.7, H * (0.0012 + 0.0032 * rnd(seed, r, 65) * rnd(seed, r, 67)) * 1.0 * (1 - 0.5 * a / life));
          ctx.globalAlpha = (1 - (a / life) * (a / life)) * (1 - fadeP);
          ctx.beginPath();
          ctx.arc(x + dx * dist + claw.nx * lat, y + dy * dist + claw.ny * lat, rad, 0, TAU);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    // 爪痕の形（画素ごとのマスク）を、画面の大きさごとに1回だけ作る。座標は画面の中心が原点
    clawMasks(W, H, seedBase) {
      const key = W + 'x' + H + ':' + seedBase;
      if (this._claw && this._claw.key === key) return this._claw;
      const L = H * 0.78;
      const ang = 133 * Math.PI / 180;
      const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
      const gap = W * 0.1;
      // [長さ, 横の位置, 頭の位置のずれ(L), 太さ]：反りの内側（左上）から。尾はほぼそろい、頭は右上へ段々にずれる
      const defs = [[0.82, 1.5, 0.18, 0.9], [0.93, 0.5, 0.07, 1.08], [1.0, -0.5, 0.0, 1.12], [0.95, -1.5, 0.1, 1.0]];
      const prof = s => (s <= 0 || s >= 1) ? 0 : Math.pow(s, 0.85) * Math.pow(1 - s, 1.25) / 0.2428;
      const smoothS = x => x * x * (3 - 2 * x);
      const vn = (x, y, sd) => {
        const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        const uu = smoothS(xf), vv = smoothS(yf);
        const a = rnd(xi, yi, sd), b = rnd(xi + 1, yi, sd), c = rnd(xi, yi + 1, sd), e = rnd(xi + 1, yi + 1, sd);
        return (a + (b - a) * uu + (c - a) * vv + (a - b - c + e) * uu * vv) * 2 - 1;
      };
      const geo = defs.map(([lk, po, hk, wk]) => {
        const len = L * lk;
        const a0 = -0.5 * L + hk * L;
        return { len, a0, po, wmax: len * 0.057 * wk, bow: len * 0.13 };
      });
      const cOff = (g, s) => g.po * gap + g.po * 0.05 * g.len * (s - 0.5) + g.bow * Math.sin(Math.PI * Math.pow(Math.min(1, Math.max(0, s)), 0.85));
      const centre = (i, s) => { const g = geo[i]; const a = g.a0 + g.len * s, off = cOff(g, s); return [ux * a + nx * off, uy * a + ny * off]; };
      const heads = geo.map((g, i) => { const [x, y] = centre(i, 0); return -0.7071 * x + 0.7071 * y; });
      const order = geo.map((_, i) => i).sort((a, b) => heads[a] - heads[b]);
      const strokes = geo.map((g, i) => {
        const seed = seedBase + i * 31;
        // 範囲
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (let j = 0; j <= 24; j++) { const [x, y] = centre(i, j / 24); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const mg = g.wmax * 3.3 + g.len * 0.06;
        x0 = Math.floor(Math.max(x0 - mg, -W / 2)); y0 = Math.floor(Math.max(y0 - mg, -H / 2));
        x1 = Math.ceil(Math.min(x1 + mg, W / 2)); y1 = Math.ceil(Math.min(y1 + mg, H / 2));
        const w = x1 - x0, h = y1 - y0;
        const A = new Uint8Array(w * h), S = new Float32Array(w * h).fill(9), F = new Uint8Array(w * h), R = new Uint8Array(w * h);
        for (let iy = 0; iy < h; iy++) {
          for (let ix = 0; ix < w; ix++) {
            const X = x0 + ix + 0.5, Y = y0 + iy + 0.5;
            const a = X * ux + Y * uy, b = X * nx + Y * ny;
            const sP = (a - g.a0) / g.len;
            if (sP < -0.02 || sP > 1.02) continue;
            const sc = Math.min(1, Math.max(0, sP));
            const off = b - cOff(g, sP);
            const hw = Math.max(g.wmax * prof(sc), 0.9);
            const r = Math.abs(off) / hw;
            if (r > 2.4) continue;
            const q = iy * w + ix;
            // 縁：筋に沿って長くのびた雑音で、縁がほつれ、刷毛目のように伸び縮みする
            const n1 = vn(a * 0.016, b * 0.28, seed + 1), n2 = vn(a * 0.05, b * 0.75, seed + 2);
            const thr = 0.92 + 0.62 * n1 + 0.34 * n2 + (rnd(ix, iy, seed + 9) - 0.5) * 0.16;
            if (r >= thr) continue;
            // 穴・かすれ・割れ
            const h1 = vn(a * 0.03, b * 0.42, seed + 3) * 0.6 + vn(a * 0.12, b * 1.3, seed + 4) * 0.4;
            const deep = 1 - Math.min(1, r * 1.25);
            if (h1 > 0.36 + 0.5 * deep) continue;
            const tt = vn(a * 0.011, b * 1.15, seed + 5);
            if (Math.abs(tt) < 0.022 && r > 0.12) continue;
            const bk = vn(a * 0.013 + b * 0.02 + 0.55 * vn(b * 0.12, a * 0.02, seed + 7), 3.7, seed + 6);
            if (bk < -0.62) continue;
            if (rnd(ix, iy, seed + 12) < 0.012 && r > 0.1) continue;
            const aa = Math.min(1, (thr - r) * hw / 1.3);
            A[q] = Math.round(255 * Math.max(0, aa));
            F[q] = Math.round(255 * Math.min(1, Math.max(0, (r - 0.45) / 0.75)));
            R[q] = Math.floor(rnd(ix, iy, seed + 13) * 255);
            S[q] = sP + n1 * 0.03 + (rnd(ix, iy, seed + 14) - 0.5) * 0.02;
          }
        }
        // 縁の外へ散る細かい粒：筋の方向（尾の側）へ流れるように、縁から離れるほどまばらに
        const NS = 230;
        for (let r = 0; r < NS; r++) {
          const sc = Math.min(1, 0.03 + 0.8 * Math.pow(rnd(seed, r, 71), 1.15));
          const hw = Math.max(g.wmax * prof(sc), 2);
          const sg = rnd(seed, r, 72) < 0.5 ? 1 : -1;
          const lat = hw * (0.95 + -Math.log(1 - rnd(seed, r, 73) * 0.999) * 0.55);
          const along = (rnd(seed, r, 74) - 0.3) * g.len * 0.14;
          const a = g.a0 + g.len * sc + along;
          const off = cOff(g, sc) + sg * lat;
          const X = ux * a + nx * off, Y = uy * a + ny * off;
          const rad = 0.55 + 1.6 * Math.pow(rnd(seed, r, 75), 2.4);
          const cx0 = Math.round(X - x0), cy0 = Math.round(Y - y0);
          const rr = Math.ceil(rad);
          for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
            const px = cx0 + dx, py = cy0 + dy;
            if (px < 0 || py < 0 || px >= w || py >= h) continue;
            const dd = Math.sqrt(dx * dx + dy * dy);
            if (dd > rad + 0.4) continue;
            const q = py * w + px;
            const av = Math.round(255 * Math.min(1, rad + 0.5 - dd));
            if (av > A[q]) { A[q] = av; F[q] = 255; R[q] = Math.floor(rnd(r, q, seed + 15) * 255); S[q] = Math.min(sc, 1) + (rnd(r, 1, seed) - 0.5) * 0.04; }
          }
        }
        const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
        const cx = cv.getContext('2d');
        return { x0, y0, w, h, A, S, F, R, cv, cx, id: cx.createImageData(w, h), key: '' };
      });
      this._claw = { key, strokes, order, ux, uy, nx, ny, centre, wmaxOf: i => geo[i].wmax };
      return this._claw;
    }

    // 悪夢（夢の致命的失敗）：きらめく星が淡い紫の光からまたたいて消え、黒い粒になって落ちる。帯の両端から黒紫の煙のひびが伸びる
    drawNightmare(ctx, d, tq, band, size, W, hh, mb, seed, fade, out) {
      const S = root.TextApngStarFx;
      // 消えていく星
      for (let i = 0; i < 18; i++) {
        const t0 = 0.1 + 0.9 * rnd(seed, i, 61);
        const life = 0.5 + 0.35 * rnd(seed, i, 62);
        const a = d - t0;
        if (a < 0) continue;
        const x = band.cx + (rnd(seed, i, 63) * 2 - 1) * W * 0.46;
        const y = band.cy + (rnd(seed, i, 64) * 2 - 1) * hh * 0.8;
        const r = size * (0.05 + 0.06 * rnd(seed, i, 65));
        if (a < life) {
          const blink = a > life * 0.6 ? (Math.floor(a * 18) % 2 ? 0.25 : 1) : 1;
          const al = Math.min(1, a / 0.12) * blink * (1 - 0.6 * clamp((a - life * 0.6) / (life * 0.4)));
          S.glint(ctx, x, y, r * (1 - 0.5 * clamp((a - life * 0.5) / (life * 0.5))), i % 3 ? '#b79aff' : '#e6dcff', 0.85 * al * fade);
        } else {
          // 黒い粒になって落ちる
          const q = (a - life) / 0.8;
          if (q >= 1) continue;
          S.softDot(ctx, x + (rnd(seed, i, 66) - 0.5) * size * 0.2 * q, y + size * 0.45 * q * q, r * 0.7, '#05020c', 0.75 * (1 - q) * fade);
        }
      }
      // 黒紫の煙のひび：帯の左右の端から文字へ向かって伸びる
      const c = EASE.outCubic(clamp((d - 0.2) / 1.0));
      if (c <= 0.01) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < 6; i++) {
        const side = i % 2;
        const y0 = band.cy + (rnd(seed, i, 71) * 2 - 1) * hh * 0.75;
        const dir = side ? -1 : 1;
        const x0 = side ? W * 1.02 : -W * 0.02;
        const len = W * (0.22 + 0.16 * rnd(seed, i, 72)) * c;
        const N = 14;
        ctx.beginPath();
        for (let m = 0; m <= N; m++) {
          const q = m / N;
          const x = x0 + dir * len * q;
          const y = y0 + (rnd(seed, i * 31 + Math.floor(m / 2), 73) - 0.5) * size * 0.28 * q + Math.sin(tq * 1.5 + i + q * 6) * size * 0.03;
          if (m) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        const g = ctx.createLinearGradient(x0, 0, x0 + dir * len, 0);
        g.addColorStop(0, S.rgba('#7a3cd8', 0.55 * fade * (1 - 0.7 * out)));
        g.addColorStop(1, S.rgba('#7a3cd8', 0));
        ctx.strokeStyle = g; ctx.lineWidth = size * 0.05; ctx.stroke();
        const g2 = ctx.createLinearGradient(x0, 0, x0 + dir * len, 0);
        g2.addColorStop(0, S.rgba('#05020c', 0.9 * fade * (1 - 0.7 * out)));
        g2.addColorStop(1, S.rgba('#05020c', 0));
        ctx.strokeStyle = g2; ctx.lineWidth = size * 0.016; ctx.stroke();
      }
      ctx.restore();
    }

    /* ---------- 炎の試作（js/fx-fire.js）と環境の演出（js/fx-ash.js） ---------- */

    // 炎で描くメインの文字の形：ページのメインの文字を、出力のピクセル座標で1文字ずつ描く関数（fill / stroke）
    fireShape(page, scale, scene) {
      const { layout } = this.prepared;
      const list = [];
      for (let i = page.first; i < page.last; i++) {
        const g = layout.glyphs[i];
        if (g.group === 0 && !g.blank) list.push(g);
      }
      // 文字・フォント（spriteKey）と、置いた位置・大きさが同じなら作り直さない（炎の下ごしらえは fx-fire.js がこの key で覚える）
      const key = `${this.spriteKey}|${scale}|${list.map(g => `${g.cx.toFixed(2)},${g.cy.toFixed(2)},${g.size.toFixed(2)}`).join(';')}`;
      if (page.fireShape && page.fireShape.key === key) return page.fireShape;
      const fonts = this.fontsFor(scene);
      const draw = (c, op) => {
        list.forEach(g => {
          c.save();
          c.translate((g.cx + g.ox) * scale, (g.cy + g.oy) * scale);
          if (g.rot) c.rotate(Math.PI / 2);
          c.font = fonts.mainFont(g.size * scale);
          c.textAlign = g.vertical ? 'center' : 'left';
          c.textBaseline = g.vertical ? 'middle' : 'alphabetic';
          if (op === 'stroke') c.strokeText(g.ch, 0, 0); else c.fillText(g.ch, 0, 0);
          c.restore();
        });
      };
      page.fireShape = { key, draw };
      return page.fireShape;
    }

    // 炎の壁・灰が一周する長さの元：書き出しのコマ数ぶんの長さ（loopLength。ずっとループで書き出すときに main.js が入れる）か、タイムラインの長さ
    loopSpan() {
      return this.loopLength || this.prepared.timeline.duration;
    }

    // 炎の壁：ページによらず画面の下でずっと燃える（書き出しの長さで継ぎ目なくループ）。文字の後ろに描く
    drawFireWall(ctx, t, scale, scene) {
      const Fx = root.TextApngFireFx;
      if (!Fx) return;
      const sfx = sfxOf(scene);
      const k = clamp(sfx.power ?? 1, 0.5, 1.6);
      const W = Math.round(scene.width * scale), H = Math.round(scene.height * scale);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      Fx.drawFireWall(ctx, W, H, t, { res: 0.67, hue: fireHue(sfx.color), height: 0.5 * k, loop: loopPeriod(this.loopSpan(), FIRE_WALL_LOOP) });
      ctx.restore();
    }

    // 走る炎・火炎ブレス・燃える文字：ページの時刻（textStart・holdEnd・outEnd・end）に合わせて試作の時間割を動かす
    drawFireFx(ctx, pg, page, t, scale, scene, sfx, k) {
      const Fx = root.TextApngFireFx;
      if (!Fx) return;
      const { layout } = this.prepared;
      const W = Math.round(scene.width * scale), H = Math.round(scene.height * scale);
      const size = layout.size * scale;
      const hue = fireHue(sfx.color);
      const pw = clamp(k, 0.5, 1.6);
      // ページの始まりからの時刻。退場しないときは、燃え尽きる時刻をずっと先にする
      const lt = t - pg.start;
      const hasOut = Number.isFinite(pg.outEnd);
      const outAt = hasOut ? pg.holdEnd - pg.start : 1e9;
      const outDur = hasOut ? Math.max(0.05, pg.outEnd - pg.holdEnd) : 1;
      const endAt = Number.isFinite(pg.end) ? pg.end - pg.start : 1e9;
      const mb = mainBox(layout, page);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (sfx.type === 'fireRun') {
        // 左から燃え広がり、文字の退場に合わせて左から消えていく
        Fx.drawFireWall(ctx, W, H, lt, { res: 0.67, hue, height: 0.5 * pw, run: { start: 0.1, dur: 1.5, out: hasOut ? outAt : undefined, outDur: 0.9, fade: 0.7, end: hasOut ? endAt : undefined } });
      } else if (sfx.type === 'fireBreath') {
        // 地面（試作と同じ高さか、文字とサブの少し下）を走って右端で爆発し、燃え上がる。文字の退場で尾が左から抜けていく
        const ground = clamp((page.box.y1 * scale + size * 0.3) / H, 0.66, 0.92);
        const run = 0.7;
        Fx.drawFireBreath(ctx, W, H, lt, { res: 0.67, hue, breath: { start: 0.05, run, hold: Math.max(0, outAt - 0.05 - run), fade: 0.6, ground, up: pw, end: hasOut ? endAt : 0 } });
      } else if (SFX_FIRE_TEXT.has(sfx.type)) {
        const shape = this.fireShape(page, scale, scene);
        const ts = pg.textStart - pg.start;
        if (sfx.type === 'fireText') {
          Fx.drawFlamingText(ctx, W, H, lt, { res: 0.67, sizePx: size, shape: shape.draw, shapeKey: shape.key, hue, rise: pw,
            timeline: { show: ts, ignite: ts + 0.15, out: outAt, outDur } });
        } else {
          // 縁取りの色が試作の金のままなら、炎の色相に合わせて回す
          const lining = /^#ffb43a$/i.test(sfx.color2 || '') ? null : sfx.color2;
          Fx.drawFlamingBattle(ctx, W, H, lt, { res: 0.67, sizePx: size, shape: shape.draw, shapeKey: shape.key, hue, lining, rise: pw,
            box: { x0: mb.x0 * scale, x1: mb.x1 * scale, cy: mb.cy * scale },
            seq: { start: 0.03, boom: ts, sweep: 0.16, dissolve: outAt, dissolveDur: outDur, end: endAt } });
        }
      }
      ctx.restore();
    }

    // 環境の演出：灰は文字や演出の上から重ね、黒煙は背景のすぐ上（文字の奥）に敷く。書き出しの長さで継ぎ目なくループ
    drawEnv(ctx, t, scale, scene, layer) {
      const env = scene.env || {};
      if (!ENV_TYPES.has(env.type)) return;
      const isSmoke = env.type === 'smoke';
      if ((layer === 'behind') !== isSmoke) return;
      const W = Math.round(scene.width * scale), H = Math.round(scene.height * scale);
      const density = clamp(env.density ?? 1, 0.1, 3);
      if (isSmoke) {
        const Smoke = root.TextApngSmokeFx;
        if (!Smoke) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        Smoke.drawSmoke(ctx, W, H, t, { loop: loopPeriod(this.loopSpan(), SMOKE_LOOP), soft: true, res: 0.5, plumes: [0.3], puffs: Math.round(85 * density), size: 1.6, opacity: 1 });
        ctx.restore();
        return;
      }
      const Ash = root.TextApngAshFx;
      if (!Ash) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      Ash.drawAsh(ctx, W, H, t, { loop: loopPeriod(this.loopSpan(), ASH_LOOP), period: ASH_LOOP, density, style: env.type === 'ashBlack' ? 'black' : 'grey' });
      ctx.restore();
    }

    drawBackground(ctx, t, scale) {
      const { scene, timeline } = this.prepared;
      const bg = scene.bg || {};
      if (!bg.type || bg.type === 'none') return;
      let alpha = clamp(bg.opacity ?? 0.5);
      if (bg.sync) {
        const pin = clamp((t - timeline.bgIn.start) / timeline.bgIn.dur);
        const pout = timeline.bgOut ? clamp((t - timeline.bgOut.start) / timeline.bgOut.dur) : 0;
        alpha *= EASE.outCubic(pin) * (1 - EASE.inCubic(pout));
      }
      if (alpha <= 0.002) return;
      const W = scene.width * scale, H = scene.height * scale;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (bg.type === 'solid') {
        ctx.fillStyle = colorWithAlpha(bg.color, alpha);
        ctx.fillRect(0, 0, W, H);
      } else if (bg.type === 'vignette') {
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.hypot(W, H) / 2);
        g.addColorStop(0, colorWithAlpha(bg.color, 0));
        g.addColorStop(1, colorWithAlpha(bg.color, alpha));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      } else if (bg.type === 'bottom' || bg.type === 'top') {
        const g = bg.type === 'bottom' ? ctx.createLinearGradient(0, H * 0.45, 0, H) : ctx.createLinearGradient(0, H * 0.55, 0, 0);
        g.addColorStop(0, colorWithAlpha(bg.color, 0));
        g.addColorStop(1, colorWithAlpha(bg.color, alpha));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }

    drawTextLayer(pg, page, t, bs, scale, scene) {
      const { layout, timeline } = this.prepared;
      const lctx = this.lctx;
      const cw = this.layer.width, ch = this.layer.height;
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'source-over';
      lctx.globalAlpha = 1;
      lctx.filter = 'none';
      lctx.clearRect(0, 0, cw, ch);
      const box = page.box;
      const bcx = (box.x0 + box.x1) / 2;
      const bcy = (box.y0 + box.y1) / 2;
      // ブロック行列: scale * T(bc + off) * R * S * T(-bc)
      const cos = Math.cos(bs.r), sin = Math.sin(bs.r);
      const bsx = bs.s * bs.sx, bsy = bs.s * bs.sy;
      const ba = scale * cos * bsx, bb = scale * sin * bsx, bc = -scale * sin * bsy, bd = scale * cos * bsy;
      const be = scale * (bcx + bs.x) - (ba * bcx + bc * bcy);
      const bf = scale * (bcy + bs.y) - (bb * bcx + bd * bcy);
      const info = { vertical: layout.vertical, dir: null, size: layout.size };
      const st = this.st;
      const list = [];
      const fireText = SFX_FIRE_TEXT.has(sfxOf(scene).type);
      for (let i = page.first; i < page.last; i++) {
        const g = layout.glyphs[i];
        if (g.blank || !g.sprite) continue;
        // 燃える文字：メインの文字は炎の演出が描く
        if (fireText && g.group === 0) continue;
        info.dir = t >= timeline.outStart[i] ? dirFor(timeline.outFx[i], scene.outDir) : dirFor(timeline.inFx[i], scene.inDir);
        if (!this.glyphState(g, t, scene, info, st)) continue;
        const persp = g.group === 0 && sfxOf(scene).type === 'p5round2' ? { dist: Math.hypot(P5_VP2.x, P5_VP2.y) * layout.size, bcx, bcy } : null;
        list.push({ g, a: st.a * bs.a, x: st.x, y: st.y, s: st.s, sx: st.sx, sy: st.sy, r: st.r + sfxGlyphTilt(scene, g), blur: st.blur, persp });
      }
      const drawPass = (layerName, alphaMul) => {
        for (let j = 0; j < list.length; j++) {
          const it = list[j];
          const sprite = it.g.sprite;
          const img = sprite[layerName];
          if (!img) continue;
          let total = it.a * alphaMul;
          if (total <= 0.002) continue;
          // 発光の強調（1より大きい倍率）は同じ層を重ねて表現する
          while (total > 0.002) {
            const alpha = Math.min(1, total);
            total -= alpha;
            this.drawSprite(lctx, it, sprite, img, alpha, [ba, bb, bc, bd, be, bf], bs, scale);
          }
        }
      };
      // 遠近つきの文字（ラウンド表示 Ver2）は別の作業用キャンバスで変形してから重ねる
      const persp = list.filter(it => it.persp);
      if (persp.length) {
        list.splice(0, list.length, ...list.filter(it => !it.persp));
        this.drawPerspText(lctx, persp, [ba, bb, bc, bd, be, bf], scale, bs.glowMul);
      }
      drawPass('glow', bs.glowMul);
      drawPass('back', 1);
      drawPass('front', 1);
      if (pg.cursor) this.drawCursor(pg, page, t, bs, [ba, bb, bc, bd, be, bf], scene);
      if (pg.solo) this.drawSolo(pg, page, t, bs, scale, scene);
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalAlpha = 1;

      const rect = this.transformedBox(box, bs, scale, layout.size);
      if (bs.bright > 0.002) {
        lctx.globalCompositeOperation = 'source-atop';
        lctx.fillStyle = `rgba(255, 255, 255, ${clamp(bs.bright)})`;
        lctx.fillRect(0, 0, cw, ch);
        lctx.globalCompositeOperation = 'source-over';
      }
      if (bs.mask && bs.mask.dir === 'burn' && pg.flameSpan) {
        // 炎の演出では、燃え際を帯の端から端まで動かす（演出の燃え際と同じ位置）
        const bf = burnFront(pg, page, t, scene, layout.size);
        if (bf) bs.mask = { ...bs.mask, x: bf.x, scale };
      }
      if (bs.mask && bs.mask.firefly) {
        // 光の粒になって消える：ほどけ際を光の粒が生まれる位置とそろえる
        const ff = fireflyFront(pg, page, t, layout.size);
        if (ff) bs.mask = { ...bs.mask, x: ff.x + bs.x, scale };
      }
      if (bs.mask && bs.mask.stardust) {
        this.applyStardust(pg, page, t, bs, scale, scene);
      } else if (bs.mask && bs.mask.ashtext) {
        this.applyAshText(pg, page, t, bs, scale, scene);
      } else if (bs.mask && bs.mask.blaze) {
        const bf = blazeFront(pg, page, t, layout.size);
        if (bf) this.applyBlaze({ x: bf.x + bs.x, scale, t, size: layout.size, seed: 500 + pg.index * 13 }, rect);
      } else if (bs.mask) this.applyMask(bs.mask, rect, layout.size * (bs.mask.firefly ? FIREFLY_SOFT : 0.6) * scale);
      if (pg.scroll && scene.scrollFade !== false) this.applyEdgeFade(pg.scroll.vertical, cw, ch);
      if (bs.glitch > 0.01) this.applyGlitch(bs.glitch, t, rect, layout.size * scale, pg.index, scene);
    }

    drawSprite(lctx, it, sprite, img, alpha, m, bs, scale) {
      const [ba, bb, bc, bd, be, bf] = m;
      const gx = it.g.cx + it.x, gy = it.g.cy + it.y;
      const gc = Math.cos(it.r), gs = Math.sin(it.r);
      const sx = it.s * it.sx, sy = it.s * it.sy;
      const la = gc * sx, lb = gs * sx, lc = -gs * sy, ld = gc * sy;
      lctx.setTransform(
        ba * la + bc * lb, bb * la + bd * lb,
        ba * lc + bc * ld, bb * lc + bd * ld,
        ba * gx + bc * gy + be, bb * gx + bd * gy + bf
      );
      lctx.globalAlpha = alpha;
      // ぼかしは文字スプライトの座標系で小さな作業用キャンバス上にかける（全面レイヤーより大幅に軽い）
      const spriteBlur = it.blur + bs.blur;
      const screenBlur = spriteBlur * scale * Math.max(Math.abs(it.s * bs.s), 0.2);
      const dx = it.g.ox - sprite.ox, dy = it.g.oy - sprite.oy;
      if (screenBlur > 0.35) this.drawBlurred(lctx, img, dx, dy, spriteBlur);
      else lctx.drawImage(img, dx, dy);
    }

    // 遠近つきの文字：線と同じ遠近で、手前ほど大きく、消失点に近いほど小さくなるよう1文字ずつ変形する。
    // 文字の軸にそろえた作業用キャンバスに、出力の1ピクセル幅の縦の列ごとに縮尺を変えて写し、
    // 最後にまとめて傾けて重ねる（列が重ならず、継ぎ目や輪郭のギザギザが出ない）
    drawPerspText(lctx, items, m, scale, glowMul) {
      const [ba, bb, bc, bd, be, bf] = m;
      const { dist, bcx, bcy } = items[0].persp;
      const R = clamp(scale * 2, 1, 4);
      // 列の幅：出力のおよそ1ピクセル分（作業用キャンバスは2倍の細かさ）
      const CW = Math.max(1, Math.round(R / Math.max(scale, 0.25)));
      const geo = items.map(it => {
        const g = it.g, sp = it.g.sprite;
        const dx = g.ox - sp.ox, dy = g.oy - sp.oy;
        const gx = g.cx + it.x - bcx, gy = g.cy + it.y - bcy;
        const a = p5Round2Map(gx + it.s * dx, dist), b = p5Round2Map(gx + it.s * (dx + sp.w), dist);
        const yTop = gy + it.s * dy, yBot = yTop + it.s * sp.h;
        return { it, g, sp, dx, dy, gx, yTop, a, b, yExt: Math.max(Math.abs(yTop), Math.abs(yBot)) * a.lam };
      });
      let x0 = Infinity, x1 = -Infinity, yMax = 1;
      geo.forEach(q => { x0 = Math.min(x0, q.a.x); x1 = Math.max(x1, q.b.x); yMax = Math.max(yMax, q.yExt); });
      x1 = Math.min(x1, dist * 0.999);
      if (!(x1 > x0)) return;
      const OW = Math.min(8192, Math.ceil((x1 - x0) * R) + 2), OH = Math.min(8192, Math.ceil(yMax * 2 * R) + 2);
      const off = this.perspTmp || (this.perspTmp = makeCanvas(8, 8));
      if (off.width < OW || off.height < OH) { off.width = Math.max(off.width, OW); off.height = Math.max(off.height, OH); }
      const o = off.getContext('2d');
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.globalCompositeOperation = 'source-over';
      o.globalAlpha = 1;
      o.clearRect(0, 0, OW, OH);
      o.imageSmoothingEnabled = true;
      o.imageSmoothingQuality = 'high';
      const pass = (layerName, mul) => {
        geo.forEach(q => {
          const img = q.sp[layerName];
          if (!img) return;
          let total = q.it.a * mul;
          while (total > 0.002) {
            o.globalAlpha = Math.min(1, total);
            total -= o.globalAlpha;
            const c0 = Math.max(0, Math.floor((q.a.x - x0) * R)), c1 = Math.min(OW, Math.ceil((q.b.x - x0) * R));
            for (let c = c0; c < c1; c += CW) {
              const xm = x0 + (c + CW / 2) / R;
              const lam = 1 - xm / dist;
              if (lam <= 0) break;
              const X = -dist * Math.log(lam);
              const su = (X - q.gx) / q.it.s - q.dx;
              const half = CW / 2 / (R * lam * q.it.s);
              const s0 = Math.max(0, su - half), s1 = Math.min(q.sp.w, su + half);
              if (s1 <= s0) continue;
              o.drawImage(img, s0, 0, s1 - s0, q.sp.h, c, (q.yTop * lam + yMax) * R, CW, q.sp.h * q.it.s * lam * R);
            }
          }
        });
      };
      pass('glow', glowMul);
      pass('back', 1);
      pass('front', 1);
      const ox = bcx + x0, oy = bcy - yMax;
      lctx.setTransform(ba / R, bb / R, bc / R, bd / R, ba * ox + bc * oy + be, bb * ox + bd * oy + bf);
      lctx.globalAlpha = 1;
      lctx.imageSmoothingQuality = 'high';
      lctx.drawImage(off, 0, 0, OW, OH, 0, 0, OW, OH);
    }

    drawBlurred(lctx, img, dx, dy, blur) {
      const pad = Math.ceil(blur * 2.4) + 2;
      const w = img.width + pad * 2;
      const h = img.height + pad * 2;
      const c = this.blurTmp;
      if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
      const bctx = c.getContext('2d');
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.globalAlpha = 1;
      bctx.clearRect(0, 0, w, h);
      if (FILTER_SUPPORTED) {
        bctx.filter = `blur(${blur.toFixed(2)}px)`;
        bctx.drawImage(img, pad, pad);
        bctx.filter = 'none';
        lctx.drawImage(c, 0, 0, w, h, dx - pad, dy - pad, w, h);
        return;
      }
      // ctx.filter 非対応ブラウザ向け：縮小→拡大でぼかしを近似
      const f = Math.max(0.06, 1 / (1 + blur / 2.2));
      const sw = Math.max(1, Math.round(w * f));
      const sh = Math.max(1, Math.round(h * f));
      bctx.imageSmoothingQuality = 'high';
      bctx.drawImage(img, pad * f, pad * f, img.width * f, img.height * f);
      lctx.imageSmoothingQuality = 'high';
      lctx.drawImage(c, 0, 0, sw, sh, dx - pad, dy - pad, w, h);
    }

    // 「中央に1文字ずつ」：いま出ている1文字を、画像の中央に大きく描く
    drawSolo(pg, page, t, bs, scale, scene) {
      const { layout, timeline } = this.prepared;
      if (t >= pg.solo.full) return;
      let hit = -1;
      for (let i = page.first; i < page.last; i++) {
        if (t >= timeline.soloStart[i] && t < timeline.soloEnd[i]) { hit = i; break; }
      }
      if (hit < 0) return;
      const sprite = this.soloSprite(layout.glyphs[hit], page, scene);
      // 出た瞬間だけわずかに大きい（同じ文字が続いても区切りがわかる）
      const p = clamp((t - timeline.soloStart[hit]) / Math.max(1e-6, timeline.soloEnd[hit] - timeline.soloStart[hit]));
      const k = clamp(scene.soloImpact ?? 1, 0, 3);
      const s = scale * (1 + 0.08 * k * (1 - p) * (1 - p));
      const lctx = this.lctx;
      lctx.setTransform(s, 0, 0, s, scale * layout.W / 2, scale * layout.H / 2);
      [[sprite.glow, bs.a * bs.glowMul], [sprite.back, bs.a], [sprite.front, bs.a]].forEach(([img, amount]) => {
        let total = img ? amount : 0;
        while (total > 0.002) {
          const alpha = Math.min(1, total);
          total -= alpha;
          lctx.globalAlpha = alpha;
          lctx.drawImage(img, -sprite.icx, -sprite.icy);
        }
      });
    }

    // 中央に出す大きな文字の画像（画像の短い辺に対する割合で大きさを決め、文字ごとに作って残しておく）
    soloSprite(g, page, scene) {
      const { layout } = this.prepared;
      const px = Math.max(8, Math.min(layout.W, layout.H) * clamp(scene.soloSize ?? 0.55, 0.05, 1));
      const gen = `${this.spriteKey}|${px.toFixed(2)}`;
      if (gen !== this.soloKey) {
        this.soloCache = new Map();
        this.soloPixels = 0;
        this.soloKey = gen;
      }
      const key = `${g.ch}|${g.rot ? 1 : 0}`;
      let sprite = this.soloCache.get(key);
      if (sprite) {
        this.soloCache.delete(key);
        this.soloCache.set(key, sprite);
        return sprite;
      }
      const k = px / g.size;
      const font = this.fontsFor(scene).mainFont(px);
      const metrics = page.mainMetrics || { inkA: g.size * 0.8, inkD: g.size * 0.12 };
      const inkA = metrics.inkA * k, inkD = metrics.inkD * k;
      this.measure.font = font;
      const adv = this.measure.measureText(g.ch).width;
      sprite = buildGlyphSprite({ ch: g.ch, size: px, vertical: g.vertical, rot: g.rot, bx: 0, by: inkA }, font, groupStyle(scene, 0, px), { w: adv, h: inkA + inkD, inkA, inkD });
      sprite.icx = (sprite.ink.x0 + sprite.ink.x1) / 2;
      sprite.icy = (sprite.ink.y0 + sprite.ink.y1) / 2;
      sprite.pixels = sprite.w * sprite.h * [sprite.glow, sprite.back, sprite.front].filter(Boolean).length;
      this.soloCache.set(key, sprite);
      this.soloPixels += sprite.pixels;
      // 大きな画像なので、しばらく使っていないものから捨てる
      while (this.soloPixels > SOLO_CACHE_PIXELS && this.soloCache.size > 1) {
        const [oldKey, old] = this.soloCache.entries().next().value;
        this.soloCache.delete(oldKey);
        this.soloPixels -= old.pixels;
      }
      return sprite;
    }

    drawCursor(pg, page, t, bs, m, scene) {
      const { layout, timeline } = this.prepared;
      if (Number.isFinite(pg.outEnd) && t >= pg.holdEnd) return;
      let last = null;
      let firstGlyph = null;
      for (let i = page.first; i < page.last; i++) {
        const g = layout.glyphs[i];
        if (g.group !== 0) continue;
        if (!firstGlyph) firstGlyph = g;
        if (timeline.inStart[i] <= t) last = g;
      }
      if (!firstGlyph) return;
      const typingDone = t >= pg.inEnd;
      if (typingDone && Math.floor((t - pg.inEnd) / 0.45) % 2 === 1) return;
      const size = layout.size;
      let x, y, w, h;
      if (layout.vertical) {
        const ref = last || firstGlyph;
        x = ref.penX - size * 0.45;
        y = last ? ref.baseline + ref.adv + size * (scene.letterSpacing || 0) + size * 0.05 : ref.baseline + size * 0.05;
        w = size * 0.9; h = size * 0.08;
      } else {
        const ref = last || firstGlyph;
        x = last ? ref.penX + ref.adv + size * 0.06 : ref.penX;
        y = ref.baseline - size * 0.82;
        w = size * 0.07; h = size * 0.98;
      }
      const lctx = this.lctx;
      lctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      lctx.globalAlpha = clamp(bs.a);
      const fill = scene.fill || {};
      lctx.fillStyle = scene.cursorColor || fill.color || '#ffffff';
      lctx.fillRect(x, y, w, h);
    }

    transformedBox(box, bs, scale, size) {
      const pad = size * 0.25;
      const cx = (box.x0 + box.x1) / 2 + bs.x;
      const cy = (box.y0 + box.y1) / 2 + bs.y;
      const hw = (box.x1 - box.x0) / 2 * Math.abs(bs.s * bs.sx) + pad;
      const hh = (box.y1 - box.y0) / 2 * Math.abs(bs.s * bs.sy) + pad;
      return { x: (cx - hw) * scale, y: (cy - hh) * scale, w: hw * 2 * scale, h: hh * 2 * scale };
    }

    // 炎に包まれて燃え尽きる：燃え際の少し先の文字を焦がし、燃え際を赤く光らせてから、燃え際より左を消す
    applyBlaze(m, rect) {
      const lctx = this.lctx;
      const cw = this.layer.width, ch = this.layer.height;
      const s = m.scale, unit = m.size * s;
      const fx = m.x * s;
      const yA = Math.max(0, rect.y - unit), yB = Math.min(ch, rect.y + rect.h + unit);
      const step = Math.max(2, unit * 0.05);
      const pts = [];
      for (let y = yA; y <= yB + step; y += step) {
        const yy = Math.min(y, yB);
        pts.push([blazeEdge(m.x, yy / s, m.t, m.size, m.seed) * s, yy]);
      }
      const curve = () => {
        lctx.beginPath();
        pts.forEach(([x, y], i) => (i ? lctx.lineTo(x, y) : lctx.moveTo(x, y)));
      };
      lctx.save();
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'source-atop';
      // 焦げ：燃え際の先の文字が茶色く暗くなる
      const g = lctx.createLinearGradient(fx - unit * 0.5, 0, fx + unit * 1.6, 0);
      g.addColorStop(0, 'rgba(36, 10, 2, 0.92)');
      g.addColorStop(0.4, 'rgba(70, 22, 4, 0.6)');
      g.addColorStop(1, 'rgba(70, 22, 4, 0)');
      lctx.fillStyle = g;
      lctx.fillRect(fx - unit * 1.2, 0, unit * 2.8, ch);
      // 燃え際：文字の上だけ、赤 → 橙 → 黄の光る縁
      const flick = 0.85 + 0.15 * noise1(m.t * 12, m.seed);
      lctx.lineJoin = 'round';
      [[0.34, BLAZE.red, 0.85], [0.2, BLAZE.orange, 0.95], [0.08, BLAZE.yellow, 1]].forEach(([w, c, a]) => {
        lctx.strokeStyle = colorWithAlpha(c, a * flick);
        lctx.lineWidth = unit * w;
        curve();
        lctx.stroke();
      });
      // 燃え際より左を消す
      lctx.globalCompositeOperation = 'destination-out';
      lctx.fillStyle = '#000';
      curve();
      lctx.lineTo(0, yB);
      lctx.lineTo(0, yA);
      lctx.closePath();
      lctx.fill();
      if (yA > 0) lctx.fillRect(0, 0, Math.max(0, fx - unit), yA);
      if (yB < ch) lctx.fillRect(0, yB, Math.max(0, fx - unit), ch - yB);
      lctx.restore();
    }

    applyMask(mask, rect, soft) {
      const lctx = this.lctx;
      const cw = this.layer.width, ch = this.layer.height;
      const s = Math.max(1, soft);
      const p = clamp(mask.p);
      lctx.save();
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'destination-in';
      let grad;
      if (mask.dir === 'burn') {
        // 燃え際より左は消え、燃え際からぼかし幅の分で元に戻る
        const front = Number.isFinite(mask.x) ? mask.x * mask.scale : lerp(rect.x - s, rect.x + rect.w, p);
        grad = lctx.createLinearGradient(front, 0, front + s, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,1)');
        lctx.fillStyle = grad;
        lctx.fillRect(0, 0, cw, ch);
        lctx.restore();
        return;
      }
      const horizontal = mask.dir === 'lr' || mask.dir === 'rl' || mask.dir === 'center';
      if (mask.dir === 'center') {
        const c = horizontal ? rect.x + rect.w / 2 : rect.y + rect.h / 2;
        const half = rect.w / 2;
        const span = half + s * 2;
        grad = lctx.createLinearGradient(c - span, 0, c + span, 0);
        const at = x => clamp((x + span) / (2 * span));
        if (!mask.out) {
          const w = lerp(0, half + s, p);
          const peak = clamp(w / s);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(at(-w), 'rgba(0,0,0,0)');
          grad.addColorStop(at(Math.min(0, -w + s)), `rgba(0,0,0,${peak})`);
          grad.addColorStop(at(Math.max(0, w - s)), `rgba(0,0,0,${peak})`);
          grad.addColorStop(at(w), 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
          const w = lerp(-s, half, p);
          grad.addColorStop(0, 'rgba(0,0,0,1)');
          if (w > 0) {
            grad.addColorStop(at(-w - s), 'rgba(0,0,0,1)');
            grad.addColorStop(at(-w), 'rgba(0,0,0,0)');
            grad.addColorStop(at(w), 'rgba(0,0,0,0)');
            grad.addColorStop(at(w + s), 'rgba(0,0,0,1)');
          } else {
            const floor = clamp(-w / s);
            grad.addColorStop(at(-w - s), 'rgba(0,0,0,1)');
            grad.addColorStop(0.5, `rgba(0,0,0,${floor})`);
            grad.addColorStop(at(w + s), 'rgba(0,0,0,1)');
          }
          grad.addColorStop(1, 'rgba(0,0,0,1)');
        }
      } else {
        const neg = mask.dir === 'rl' || mask.dir === 'bt';
        const lo = horizontal ? rect.x : rect.y;
        const hi = horizontal ? rect.x + rect.w : rect.y + rect.h;
        const U0 = neg ? -hi : lo;
        const U1 = neg ? -lo : hi;
        let a, b, fromOpaque;
        if (!mask.out) {
          const E = lerp(U0, U1 + s, p);
          a = E - s; b = E; fromOpaque = true;
        } else {
          const E = lerp(U0 - s, U1, p);
          a = E; b = E + s; fromOpaque = false;
        }
        if (neg) { const na = -a, nb = -b; a = na; b = nb; }
        grad = horizontal ? lctx.createLinearGradient(a, 0, b, 0) : lctx.createLinearGradient(0, a, 0, b);
        grad.addColorStop(0, fromOpaque ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0)');
        grad.addColorStop(1, fromOpaque ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
      }
      lctx.fillStyle = grad;
      lctx.fillRect(0, 0, cw, ch);
      lctx.restore();
    }

    applyEdgeFade(vertical, cw, ch) {
      const lctx = this.lctx;
      lctx.save();
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = 'destination-in';
      const grad = vertical ? lctx.createLinearGradient(0, 0, cw, 0) : lctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.14, 'rgba(0,0,0,1)');
      grad.addColorStop(0.86, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = grad;
      lctx.fillRect(0, 0, cw, ch);
      lctx.restore();
    }

    // ノイズ：左右にずらした2色の写し（scene.glitchColor / glitchColor2）と、横に切ってずらした帯
    applyGlitch(amount, t, rect, sizePx, seedBase, scene) {
      const cw = this.layer.width, ch = this.layer.height;
      const lctx = this.lctx;
      const a = this.tmpA.getContext('2d');
      const b = this.tmpB.getContext('2d');
      const frame = Math.floor(t * 20);
      const seed = 400 + seedBase * 7;
      const k = clamp(amount, 0, 2);
      a.setTransform(1, 0, 0, 1, 0, 0);
      a.globalCompositeOperation = 'source-over';
      a.clearRect(0, 0, cw, ch);
      a.drawImage(this.layer, 0, 0);
      // 色ずれ
      const shift = Math.max(1, sizePx * 0.045 * k * (0.6 + rnd(frame, 1, seed) * 0.8));
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.clearRect(0, 0, cw, ch);
      const tint = (color, dx) => {
        b.setTransform(1, 0, 0, 1, 0, 0);
        b.globalCompositeOperation = 'source-over';
        b.clearRect(0, 0, cw, ch);
        b.drawImage(this.tmpA, 0, 0);
        b.globalCompositeOperation = 'source-in';
        b.fillStyle = color;
        b.fillRect(0, 0, cw, ch);
        b.globalCompositeOperation = 'source-over';
        lctx.globalAlpha = 0.8;
        lctx.drawImage(this.tmpB, dx, 0);
      };
      tint(scene.glitchColor || '#ff285a', -shift);
      tint(scene.glitchColor2 || '#28e6ff', shift);
      lctx.globalAlpha = 1;
      lctx.drawImage(this.tmpA, 0, 0);
      // 横スライス
      a.clearRect(0, 0, cw, ch);
      a.drawImage(this.layer, 0, 0);
      const slices = 2 + Math.floor(rnd(frame, 2, seed) * 5 * Math.min(1, k + 0.3));
      for (let i = 0; i < slices; i++) {
        const y = rect.y + rnd(frame, 10 + i, seed) * rect.h;
        const h = Math.max(1, sizePx * (0.03 + rnd(frame, 30 + i, seed) * 0.14));
        const dx = (rnd(frame, 50 + i, seed) - 0.5) * sizePx * 0.5 * k;
        lctx.clearRect(0, y, cw, h);
        lctx.drawImage(this.tmpA, 0, y, cw, h, dx, y, cw, h);
      }
    }

    drawDeco(ctx, pg, page, t, bs, scale, scene) {
      const d = scene.deco || {};
      if (!d.type || d.type === 'none') return;
      const { pin, pout } = this.decoProgress(pg, t);
      const animated = d.anim && d.anim !== 'none';
      const ein = animated ? EASE.outCubic(pin) : (pin > 0 ? 1 : 0);
      const eout = animated ? EASE.inCubic(pout) : (pout >= 1 ? 1 : 0);
      if (ein <= 0.001 || eout >= 0.999) return;
      const grow = d.anim === 'grow';
      const g = grow ? ein * (1 - eout) : 1;
      const alpha = grow ? clamp(g * 4) : ein * (1 - eout);
      if (alpha <= 0.002) return;
      const { layout } = this.prepared;
      const size = layout.size;
      const vertical = layout.vertical;
      const W = scene.width, H = scene.height;
      const pad = (d.pad || 0) * size;
      const ext = (d.extend || 0) * size;
      const th = Math.max(0.5, (d.thickness || 2) * layout.fit);
      const box = page.box;
      const mb = page.mainBox;
      const lineColor = d.color2 || '#ffffff';
      const fillColor = colorWithAlpha(d.color || '#000000', clamp(d.opacity ?? 0.5));
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, bs.x * scale, bs.y * scale);
      ctx.globalAlpha = alpha;
      // 線の装飾にも文字と同じ縁取りをつける：外側の縁取り → 縁取り → 線の順に、太い線から重ねる
      const edges = [];
      if (d.outline) {
        const e1 = scene.stroke && scene.stroke.on ? Math.max(0, scene.stroke.width || 0) * layout.fit : 0;
        const e2 = scene.stroke2 && scene.stroke2.on ? Math.max(0, scene.stroke2.width || 0) * layout.fit : 0;
        if (e2 > 0) edges.push({ w: th + 2 * (e1 + e2), color: scene.stroke2.color });
        if (e1 > 0) edges.push({ w: th + 2 * e1, color: scene.stroke.color });
      }
      // path は線の形を作る関数（線の端の縁取りは、端を四角く伸ばして囲む）
      const strokePath = (path, cap) => {
        edges.forEach(edge => {
          ctx.strokeStyle = edge.color;
          ctx.lineWidth = edge.w;
          ctx.lineCap = 'square';
          ctx.beginPath();
          path();
          ctx.stroke();
        });
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = th;
        ctx.lineCap = cap;
        ctx.beginPath();
        path();
        ctx.stroke();
      };
      const line = (x0, y0, x1, y1) => strokePath(() => { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }, 'butt');
      switch (d.type) {
        case 'band': {
          const soft = clamp(d.soft ?? 0.4, 0, 1) * 0.5;
          const side = clamp(d.sideFade ?? 0, 0, 1) * 0.5;
          if (!vertical) {
            const cy = (box.y0 + box.y1) / 2;
            const half = (box.y1 - box.y0) / 2 + pad;
            const hh = half * (grow ? g : 1);
            this.drawBand(ctx, -bs.x, cy - hh, W, hh * 2, false, soft, side, fillColor, scale);
          } else {
            const cx = (box.x0 + box.x1) / 2;
            const half = (box.x1 - box.x0) / 2 + pad;
            const hw = half * (grow ? g : 1);
            this.drawBand(ctx, cx - hw, -bs.y, hw * 2, H, true, soft, side, fillColor, scale);
          }
          break;
        }
        case 'tape': {
          // 虎柄テープ：文字の上下（縦書きは右と左）に、画面の端から端までしま模様のテープを張る。
          // 上（右）のテープは左（上）へ、下（左）のテープは右（下）へ流れ、点滅する。
          // 「伸びる」では、それぞれ流れる向きに画面の外からすべり込み、退場で流れる向きへ抜けていく
          const tw = Math.max(2, (d.tapeSize ?? 40) * layout.fit);
          const speed = Math.max(0, d.tapeSpeed ?? 90) * layout.fit;
          const blink = clamp(d.tapeBlink ?? 0.5);
          const colorA = d.tapeColor || '#f5c400';
          const colorB = d.tapeStripe || '#151515';
          const len = vertical ? H : W;
          const origin = vertical ? -bs.y : -bs.x;
          const inShift = grow ? len * ein : 0;
          const outShift = grow ? len * eout : 0;
          const baseA = grow ? 1 : ein * (1 - eout);
          // 1本目（上／右）：流れる向きの逆側の端から入り、流れる向きへ抜ける
          const firstA = origin + len - inShift, firstB = origin + len - outShift;
          // 2本目（下／左）：反対向き
          const secondA = origin + outShift, secondB = origin + inShift;
          const drift = speed * t;
          const tapes = vertical
            ? [{ v0: box.x1 + pad, a: firstA, b: firstB, offset: origin - drift - inShift - outShift, phase: 0 },
              { v0: box.x0 - pad - tw, a: secondA, b: secondB, offset: origin + drift + inShift + outShift, phase: 0.5 }]
            : [{ v0: box.y0 - pad - tw, a: firstA, b: firstB, offset: origin - drift - inShift - outShift, phase: 0 },
              { v0: box.y1 + pad, a: secondA, b: secondB, offset: origin + drift + inShift + outShift, phase: 0.5 }];
          tapes.forEach(tp => {
            const a = Math.max(origin, tp.a), b = Math.min(origin + len, tp.b);
            if (b - a < 0.5) return;
            ctx.globalAlpha = baseA * (1 - blink * tapeBlinkWave(t, tp.phase));
            if (ctx.globalAlpha <= 0.002) return;
            this.drawTape(ctx, vertical, a, b, tp.v0, tw, tp.offset, colorA, colorB);
          });
          break;
        }
        case 'box': {
          const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
          const hw = (box.x1 - box.x0) / 2 + pad, hh = (box.y1 - box.y0) / 2 + pad;
          ctx.translate(cx, cy);
          ctx.scale(bs.s * bs.sx * (grow && !vertical ? g : 1), bs.s * bs.sy * (grow && vertical ? g : 1));
          const radius = Math.min(hw, hh, (d.radius ?? 0.2) * size);
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(-hw, -hh, hw * 2, hh * 2, radius);
          else ctx.rect(-hw, -hh, hw * 2, hh * 2);
          ctx.fillStyle = fillColor;
          ctx.fill();
          if ((d.thickness || 0) > 0) { ctx.strokeStyle = lineColor; ctx.lineWidth = th; ctx.stroke(); }
          break;
        }
        case 'lines': {
          if (!vertical) {
            const cx = (box.x0 + box.x1) / 2;
            const half = ((box.x1 - box.x0) / 2 + ext) * g;
            line(cx - half, box.y0 - pad, cx + half, box.y0 - pad);
            line(cx - half, box.y1 + pad, cx + half, box.y1 + pad);
          } else {
            const cy = (box.y0 + box.y1) / 2;
            const half = ((box.y1 - box.y0) / 2 + ext) * g;
            line(box.x0 - pad, cy - half, box.x0 - pad, cy + half);
            line(box.x1 + pad, cy - half, box.x1 + pad, cy + half);
          }
          break;
        }
        case 'underline': {
          const sub = page.subBox;
          if (!vertical) {
            let y = mb.y1 + pad;
            if (sub && sub.y0 >= mb.y1) y = (mb.y1 + sub.y0) / 2;
            const x0 = box.x0 - ext, x1 = box.x1 + ext;
            const a = grow ? lerp(x0, x1, eout) : x0;
            const b = grow ? lerp(x0, x1, ein) : x1;
            if (b > a) line(a, y, b, y);
          } else {
            let x = mb.x0 - pad;
            if (sub && sub.x1 <= mb.x0) x = (mb.x0 + sub.x1) / 2;
            const y0 = box.y0 - ext, y1 = box.y1 + ext;
            const a = grow ? lerp(y0, y1, eout) : y0;
            const b = grow ? lerp(y0, y1, ein) : y1;
            if (b > a) line(x, a, x, b);
          }
          break;
        }
        case 'sides': {
          const len = Math.max(size * 0.2, ext) * g;
          if (!vertical) {
            const cy = (mb.y0 + mb.y1) / 2;
            line(mb.x0 - pad - len, cy, mb.x0 - pad, cy);
            line(mb.x1 + pad, cy, mb.x1 + pad + len, cy);
          } else {
            const cx = (mb.x0 + mb.x1) / 2;
            line(cx, mb.y0 - pad - len, cx, mb.y0 - pad);
            line(cx, mb.y1 + pad, cx, mb.y1 + pad + len);
          }
          break;
        }
        case 'bar': {
          if (!vertical) {
            const x = box.x0 - pad - th / 2;
            line(x, box.y0, x, lerp(box.y0, box.y1, g));
          } else {
            const y = box.y0 - pad - th / 2;
            line(box.x1, y, lerp(box.x1, box.x0, g), y);
          }
          break;
        }
        case 'corners': {
          const x0 = box.x0 - pad, y0 = box.y0 - pad, x1 = box.x1 + pad, y1 = box.y1 + pad;
          const arm = Math.min(x1 - x0, y1 - y0) * 0.28 * g;
          const inset = (1 - g) * size * 0.4;
          const corner = (x, y, sx, sy) => {
            const cx = x + sx * -inset, cy = y + sy * -inset;
            ctx.moveTo(cx + sx * arm, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + sy * arm);
          };
          strokePath(() => {
            corner(x0, y0, 1, 1);
            corner(x1, y0, -1, 1);
            corner(x0, y1, 1, -1);
            corner(x1, y1, -1, -1);
          }, 'square');
          break;
        }
        case 'frame': {
          // タイトル枠：メインの文字だけを囲み、サブテキストは枠の外に置く（余白はサブテキストとの間の半分まで）。
          // 左右（縦書きは上下）は extend の分だけ延ばして画面の内側で止める
          const inset = Math.max(th, (scene.marginX ?? 64) * 0.5);
          const sb = page.subBox;
          let x0, y0, x1, y1;
          if (!vertical) {
            let padT = pad, padB = pad;
            if (sb && sb.y0 >= mb.y1) padB = Math.min(pad, (sb.y0 - mb.y1) / 2);
            else if (sb && sb.y1 <= mb.y0) padT = Math.min(pad, (mb.y0 - sb.y1) / 2);
            y0 = mb.y0 - padT;
            y1 = mb.y1 + padB;
            x0 = Math.max(-bs.x + inset, mb.x0 - pad - ext);
            x1 = Math.min(W - bs.x - inset, mb.x1 + pad + ext);
          } else {
            let padL = pad, padR = pad;
            if (sb && sb.x1 <= mb.x0) padL = Math.min(pad, (mb.x0 - sb.x1) / 2);
            else if (sb && sb.x0 >= mb.x1) padR = Math.min(pad, (sb.x0 - mb.x1) / 2);
            x0 = mb.x0 - padL;
            x1 = mb.x1 + padR;
            y0 = Math.max(-bs.y + inset, mb.y0 - pad - ext);
            y1 = Math.min(H - bs.y - inset, mb.y1 + pad + ext);
          }
          if (x1 - x0 < 1 || y1 - y0 < 1) break;
          const fillA = clamp(d.opacity ?? 0) * (grow ? clamp(g * 1.5) : 1);
          if (fillA > 0.002) {
            ctx.save();
            ctx.globalAlpha = alpha * fillA;
            ctx.fillStyle = d.color || '#000000';
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            ctx.restore();
          }
          if ((d.thickness || 0) > 0) {
            // 伸びるアニメーションでは、上辺（縦書きは右辺）の始点から一筆書きで線が伸びる／消える
            const w = x1 - x0, h = y1 - y0, perimeter = 2 * (w + h);
            ctx.lineJoin = 'miter';
            if (grow && g < 0.999) ctx.setLineDash([perimeter * g, perimeter]);
            strokePath(() => {
              if (!vertical) {
                ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0, y1);
              } else {
                ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y0);
              }
              ctx.closePath();
            }, 'butt');
            ctx.setLineDash([]);
          }
          break;
        }
        default: break;
      }
      ctx.restore();
    }

    // しま模様のテープを1本描く。u は長さ方向（横書きは x、縦書きは y）、v0・tw は太さ方向の位置と太さ。
    // しまの位置は offset だけで決まり、見えている範囲 [u0, u1] が変わっても模様は動かない
    drawTape(ctx, vertical, u0, u1, v0, tw, offset, colorA, colorB) {
      const pt = (u, v) => (vertical ? [v, u] : [u, v]);
      ctx.save();
      ctx.beginPath();
      if (vertical) ctx.rect(v0, u0, tw, u1 - u0);
      else ctx.rect(u0, v0, u1 - u0, tw);
      ctx.clip();
      ctx.fillStyle = colorA;
      ctx.fill();
      const period = tw * 1.3;
      const stripe = period * 0.5;
      const slant = tw;
      const first = Math.floor((u0 - slant - stripe - offset) / period) - 1;
      ctx.beginPath();
      for (let k = first; ; k++) {
        const u = k * period + offset;
        if (u > u1 + period) break;
        const p1 = pt(u, v0 + tw), p2 = pt(u + stripe, v0 + tw), p3 = pt(u + stripe + slant, v0), p4 = pt(u + slant, v0);
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.lineTo(p4[0], p4[1]);
        ctx.closePath();
      }
      ctx.fillStyle = colorB;
      ctx.fill();
      ctx.restore();
    }

    drawBand(ctx, x, y, w, h, vertical, soft, side, color, scale) {
      if (w <= 0.5 || h <= 0.5) return;
      const pw = Math.max(1, Math.ceil(w * scale));
      const ph = Math.max(1, Math.ceil(h * scale));
      const c = this.bandCanvas;
      const key = `${pw}|${ph}|${vertical}|${soft}|${side}|${color}`;
      if (this.bandKey === key) {
        this.blitBand(ctx, c, x, y, scale);
        return;
      }
      this.bandKey = key;
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
      const b = c.getContext('2d');
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.globalCompositeOperation = 'source-over';
      b.clearRect(0, 0, pw, ph);
      b.fillStyle = color;
      b.fillRect(0, 0, pw, ph);
      b.globalCompositeOperation = 'destination-in';
      const toMask = grad => {
        b.fillStyle = grad;
        b.fillRect(0, 0, pw, ph);
      };
      const acrossMask = vertical ? b.createLinearGradient(0, 0, pw, 0) : b.createLinearGradient(0, 0, 0, ph);
      acrossMask.addColorStop(0, soft > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
      acrossMask.addColorStop(Math.max(0.0001, soft), 'rgba(0,0,0,1)');
      acrossMask.addColorStop(Math.min(0.9999, 1 - soft), 'rgba(0,0,0,1)');
      acrossMask.addColorStop(1, soft > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
      toMask(acrossMask);
      if (side > 0) {
        const along = vertical ? b.createLinearGradient(0, 0, 0, ph) : b.createLinearGradient(0, 0, pw, 0);
        along.addColorStop(0, 'rgba(0,0,0,0)');
        along.addColorStop(side, 'rgba(0,0,0,1)');
        along.addColorStop(1 - side, 'rgba(0,0,0,1)');
        along.addColorStop(1, 'rgba(0,0,0,0)');
        toMask(along);
      }
      this.blitBand(ctx, c, x, y, scale);
    }

    blitBand(ctx, c, x, y, scale) {
      ctx.save();
      const m = ctx.getTransform();
      ctx.setTransform(1, 0, 0, 1, m.e, m.f);
      ctx.drawImage(c, x * scale, y * scale);
      ctx.restore();
    }
  }

  const api = {
    TextRenderer,
    IN_EFFECTS,
    OUT_EFFECTS,
    HOLD_EFFECTS,
    IN_MAP,
    OUT_MAP,
    HOLD_MAP,
    SFX_TYPES,
    EASE,
    EASING_CHOICES,
    dirFor,
    graphemes,
    fontString,
    cssFontFamily,
    computeLayout,
    buildTimeline,
    FILTER_SUPPORTED
  };
  root.TextApngEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
