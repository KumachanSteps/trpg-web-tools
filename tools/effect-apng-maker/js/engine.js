/*
 * 演出APNGメーカー — アセットを読み込んで1コマずつ描く
 * どのアセットも自分専用のレイヤー（canvas）に描き、そのあと不透明度をかけて出力先に重ねる。
 * こうすると、アセットの中で destination-out などを使っても、背景や他のレイヤーを壊さない。
 */

const LIB_BASE = new URL('../library/', import.meta.url);
const modules = new Map();

export async function loadManifest() {
  const res = await fetch(new URL('manifest.json', LIB_BASE), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return res.json();
}

async function loadModule(asset) {
  if (asset.kind !== 'procedural') return {};
  if (!modules.has(asset.id)) {
    const url = new URL(`${asset.path}/render.js?v=${asset.version}`, LIB_BASE);
    modules.set(asset.id, import(url.href).then(m => m.default || {}));
  }
  return modules.get(asset.id);
}

export function defaultParams(asset) {
  const out = {};
  (asset.params || []).forEach(p => { out[p.key] = typeof p.default === 'object' ? { ...p.default } : p.default; });
  return out;
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 転換の進み具合：out は 0→1 で覆う、in は 1→0 で現れる、inout は覆ってから現れる */
export function coverAmount(direction, t) {
  if (direction === 'in') return 1 - t;
  if (direction === 'inout') return t < 0.5 ? t * 2 : 2 - t * 2;
  return t;
}

/**
 * 1つのアセットを、決まった大きさ・長さ・設定で描くためのもの。
 * opts: { w, h, duration, fps, play: 'loop'|'once', direction, seed, opacity }
 */
export class EffectInstance {
  constructor(asset, params, opts, lookup) {
    this.asset = asset;
    this.params = { ...defaultParams(asset), ...params };
    this.opts = opts;
    this.lookup = lookup;
    this.layers = [];
    this.canvas = makeCanvas(opts.w, opts.h);
    this.ctx = this.canvas.getContext('2d');
  }

  async init() {
    const { asset, opts } = this;
    const S = { w: opts.w, h: opts.h, duration: opts.duration, fps: opts.fps, play: opts.play, seed: opts.seed || 1 };
    if (asset.kind === 'combo') {
      for (const layer of asset.layers) {
        const sub = this.lookup(layer.asset);
        if (!sub) continue;
        if (layer.skipIfZero && !(this.params[layer.skipIfZero] > 0)) continue;
        const p = { ...defaultParams(sub), ...(layer.params || {}) };
        Object.entries(layer.map || {}).forEach(([to, from]) => { p[to] = this.params[from]; });
        const mod = await loadModule(sub);
        const subS = { ...S, play: sub.playback.allowed.includes(opts.play) ? opts.play : sub.playback.default };
        this.layers.push({ asset: sub, mod, P: p, S: subS, state: mod.setup ? mod.setup(p, subS) : null });
      }
      this.scratch = makeCanvas(opts.w, opts.h);
      this.sctx = this.scratch.getContext('2d');
    } else {
      const mod = await loadModule(asset);
      this.layers.push({ asset, mod, P: this.params, S, state: mod.setup ? mod.setup(this.params, S) : null });
    }
    return this;
  }

  /** t は 0..1。描いた結果は this.canvas に入る */
  draw(t) {
    const { ctx, opts } = this;
    ctx.clearRect(0, 0, opts.w, opts.h);
    const single = this.layers.length === 1 && !this.scratch;
    for (const L of this.layers) {
      const target = single ? ctx : this.sctx;
      if (!single) target.clearRect(0, 0, opts.w, opts.h);
      target.save();
      if (L.asset.type === 'transition') {
        const p = coverAmount(opts.direction, t);
        if (p > 0.0005 && L.mod.cover) L.mod.cover(target, Math.min(1, p), L.P, L.state, L.S);
      } else if (L.mod.draw) {
        L.mod.draw(target, t, L.P, L.state, L.S);
      }
      target.restore();
      if (!single) ctx.drawImage(this.scratch, 0, 0);
    }
    return this.canvas;
  }

  /** 出力先に、不透明度をかけて重ねる */
  composite(dest, t, x = 0, y = 0, w = this.opts.w, h = this.opts.h) {
    this.draw(t);
    const prev = dest.globalAlpha;
    dest.globalAlpha = prev * (this.opts.opacity ?? 1);
    dest.drawImage(this.canvas, x, y, w, h);
    dest.globalAlpha = prev;
  }
}

/** 書き出しのコマ数と、各コマの t。ループは t=1（=t=0）を含めない、1回再生は最後の t=1 を含める */
export function frameTimes(duration, fps, play) {
  const n = Math.max(1, Math.round(duration * fps));
  if (play === 'loop') return Array.from({ length: n }, (_, i) => i / n);
  return Array.from({ length: n + 1 }, (_, i) => i / n);
}
