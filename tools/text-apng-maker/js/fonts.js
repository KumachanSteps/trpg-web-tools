/*
 * 文字画像APNGメーカー — フォント管理
 *  - Google Fonts（選択時にだけCSSを読み込み、使う文字のサブセットだけを取得）
 *  - フォントファイルの読み込み（TTF / OTF / WOFF / WOFF2）
 *  - PCにインストール済みのフォント名を指定
 */
(function (root) {
  'use strict';

  const CATEGORIES = [
    { id: 'gothic', label: { ja: 'ゴシック', en: 'Gothic / Sans' } },
    { id: 'mincho', label: { ja: '明朝', en: 'Mincho / Serif' } },
    { id: 'round', label: { ja: '丸ゴ・ポップ', en: 'Rounded / Pop' } },
    { id: 'display', label: { ja: 'デザイン', en: 'Display' } },
    { id: 'brush', label: { ja: '筆・手書き', en: 'Brush / Handwritten' } },
    { id: 'latin', label: { ja: '欧文', en: 'Latin' } },
    { id: 'user', label: { ja: 'マイフォント', en: 'My Fonts' } }
  ];

  // jp: 欧文フォントで日本語を表示するときの代替フォント
  const CATALOG = [
    { id: 'noto-sans-jp', family: 'Noto Sans JP', weights: [400, 700, 900], cat: 'gothic', generic: 'sans-serif' },
    { id: 'zen-kaku-gothic-new', family: 'Zen Kaku Gothic New', weights: [400, 700, 900], cat: 'gothic', generic: 'sans-serif' },
    { id: 'zen-kaku-gothic-antique', family: 'Zen Kaku Gothic Antique', weights: [400, 700, 900], cat: 'gothic', generic: 'sans-serif' },
    { id: 'm-plus-1p', family: 'M PLUS 1p', weights: [400, 700, 900], cat: 'gothic', generic: 'sans-serif' },
    { id: 'murecho', family: 'Murecho', weights: [400, 700, 900], cat: 'gothic', generic: 'sans-serif' },
    { id: 'biz-udpgothic', family: 'BIZ UDPGothic', weights: [400, 700], cat: 'gothic', generic: 'sans-serif' },
    { id: 'sawarabi-gothic', family: 'Sawarabi Gothic', weights: [400], cat: 'gothic', generic: 'sans-serif' },

    { id: 'noto-serif-jp', family: 'Noto Serif JP', weights: [400, 700, 900], cat: 'mincho', generic: 'serif' },
    { id: 'shippori-mincho', family: 'Shippori Mincho', weights: [400, 700, 800], cat: 'mincho', generic: 'serif' },
    { id: 'shippori-mincho-b1', family: 'Shippori Mincho B1', weights: [400, 700, 800], cat: 'mincho', generic: 'serif' },
    { id: 'zen-old-mincho', family: 'Zen Old Mincho', weights: [400, 700, 900], cat: 'mincho', generic: 'serif' },
    { id: 'kaisei-tokumin', family: 'Kaisei Tokumin', weights: [400, 700, 800], cat: 'mincho', generic: 'serif' },
    { id: 'kaisei-opti', family: 'Kaisei Opti', weights: [400, 700], cat: 'mincho', generic: 'serif' },
    { id: 'hina-mincho', family: 'Hina Mincho', weights: [400], cat: 'mincho', generic: 'serif' },
    { id: 'biz-udpmincho', family: 'BIZ UDPMincho', weights: [400, 700], cat: 'mincho', generic: 'serif' },
    { id: 'sawarabi-mincho', family: 'Sawarabi Mincho', weights: [400], cat: 'mincho', generic: 'serif' },

    { id: 'm-plus-rounded-1c', family: 'M PLUS Rounded 1c', weights: [400, 700, 900], cat: 'round', generic: 'sans-serif' },
    { id: 'zen-maru-gothic', family: 'Zen Maru Gothic', weights: [400, 700, 900], cat: 'round', generic: 'sans-serif' },
    { id: 'kosugi-maru', family: 'Kosugi Maru', weights: [400], cat: 'round', generic: 'sans-serif' },
    { id: 'kiwi-maru', family: 'Kiwi Maru', weights: [400, 500], cat: 'round', generic: 'serif' },
    { id: 'mochiy-pop-one', family: 'Mochiy Pop One', weights: [400], cat: 'round', generic: 'sans-serif' },
    { id: 'hachi-maru-pop', family: 'Hachi Maru Pop', weights: [400], cat: 'round', generic: 'cursive' },
    { id: 'potta-one', family: 'Potta One', weights: [400], cat: 'round', generic: 'cursive' },

    { id: 'dela-gothic-one', family: 'Dela Gothic One', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'rocknroll-one', family: 'RocknRoll One', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'reggae-one', family: 'Reggae One', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'rampart-one', family: 'Rampart One', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'train-one', family: 'Train One', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'stick', family: 'Stick', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'dotgothic16', family: 'DotGothic16', weights: [400], cat: 'display', generic: 'monospace' },
    { id: 'kaisei-decol', family: 'Kaisei Decol', weights: [400, 700], cat: 'display', generic: 'serif' },
    { id: 'zen-antique', family: 'Zen Antique', weights: [400], cat: 'display', generic: 'serif' },
    { id: 'shippori-antique', family: 'Shippori Antique', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'new-tegomin', family: 'New Tegomin', weights: [400], cat: 'display', generic: 'serif' },
    { id: 'darumadrop-one', family: 'Darumadrop One', weights: [400], cat: 'display', generic: 'cursive', jp: 'mochiy-pop-one' },

    { id: 'yuji-syuku', family: 'Yuji Syuku', weights: [400], cat: 'brush', generic: 'serif' },
    { id: 'yuji-mai', family: 'Yuji Mai', weights: [400], cat: 'brush', generic: 'serif' },
    { id: 'yuji-boku', family: 'Yuji Boku', weights: [400], cat: 'brush', generic: 'serif' },
    { id: 'klee-one', family: 'Klee One', weights: [400, 600], cat: 'brush', generic: 'cursive' },
    { id: 'yomogi', family: 'Yomogi', weights: [400], cat: 'brush', generic: 'cursive' },
    { id: 'zen-kurenaido', family: 'Zen Kurenaido', weights: [400], cat: 'brush', generic: 'cursive' },
    { id: 'yusei-magic', family: 'Yusei Magic', weights: [400], cat: 'brush', generic: 'cursive' },

    { id: 'cinzel', family: 'Cinzel', weights: [400, 700, 900], cat: 'latin', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'cinzel-decorative', family: 'Cinzel Decorative', weights: [400, 700, 900], cat: 'latin', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'playfair-display', family: 'Playfair Display', weights: [400, 700, 900], cat: 'latin', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'cormorant-garamond', family: 'Cormorant Garamond', weights: [400, 700], cat: 'latin', generic: 'serif', jp: 'shippori-mincho' },
    { id: 'im-fell-english', family: 'IM Fell English', weights: [400], cat: 'latin', generic: 'serif', jp: 'zen-old-mincho' },
    { id: 'unifraktur-maguntia', family: 'UnifrakturMaguntia', weights: [400], cat: 'latin', generic: 'serif', jp: 'zen-antique' },
    { id: 'bebas-neue', family: 'Bebas Neue', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'noto-sans-jp' },
    { id: 'oswald', family: 'Oswald', weights: [400, 700], cat: 'latin', generic: 'sans-serif', jp: 'noto-sans-jp' },
    { id: 'anton', family: 'Anton', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'orbitron', family: 'Orbitron', weights: [400, 700, 900], cat: 'latin', generic: 'sans-serif', jp: 'zen-kaku-gothic-new' },
    { id: 'audiowide', family: 'Audiowide', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'zen-kaku-gothic-new' },
    { id: 'russo-one', family: 'Russo One', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'black-ops-one', family: 'Black Ops One', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'special-elite', family: 'Special Elite', weights: [400], cat: 'latin', generic: 'monospace', jp: 'new-tegomin' },
    { id: 'share-tech-mono', family: 'Share Tech Mono', weights: [400], cat: 'latin', generic: 'monospace', jp: 'dotgothic16' },
    { id: 'vt323', family: 'VT323', weights: [400], cat: 'latin', generic: 'monospace', jp: 'dotgothic16' },
    { id: 'press-start-2p', family: 'Press Start 2P', weights: [400], cat: 'latin', generic: 'monospace', jp: 'dotgothic16' },
    { id: 'creepster', family: 'Creepster', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-syuku' },
    { id: 'nosifer', family: 'Nosifer', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-syuku' },
    { id: 'butcherman', family: 'Butcherman', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-syuku' },
    { id: 'eater', family: 'Eater', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-syuku' },
    { id: 'rubik-glitch', family: 'Rubik Glitch', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'metal-mania', family: 'Metal Mania', weights: [400], cat: 'latin', generic: 'cursive', jp: 'zen-antique' },
    { id: 'great-vibes', family: 'Great Vibes', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-mai' },
    { id: 'pinyon-script', family: 'Pinyon Script', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-mai' }
  ];

  const byId = new Map(CATALOG.map(font => [font.id, font]));
  const userFonts = new Map();
  const cssPromises = new Map();
  const previewPromises = new Map();
  let uploadCounter = 0;

  function googleCssUrl(font, extra = '') {
    const family = encodeURIComponent(font.family).replace(/%20/g, '+');
    const weights = font.weights || [400];
    const spec = weights.length === 1 && weights[0] === 400 ? '' : `:wght@${weights.join(';')}`;
    return `https://fonts.googleapis.com/css2?family=${family}${spec}${extra}&display=swap`;
  }

  function ensureCss(font) {
    if (!font || !font.family || font.user) return Promise.resolve(true);
    if (cssPromises.has(font.id)) return cssPromises.get(font.id);
    const promise = new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = googleCssUrl(font);
      link.dataset.fontId = font.id;
      link.onload = () => resolve(true);
      link.onerror = () => resolve(false);
      document.head.appendChild(link);
      setTimeout(() => resolve(false), 12000);
    });
    cssPromises.set(font.id, promise);
    return promise;
  }

  function get(id) {
    if (!id) return byId.get('noto-sans-jp');
    if (byId.has(id)) return byId.get(id);
    if (userFonts.has(id)) return userFonts.get(id);
    if (id.startsWith('local:')) {
      const name = id.slice(6);
      const font = { id, family: name, weights: [400, 700], cat: 'user', generic: 'sans-serif', user: true, local: true, label: name };
      userFonts.set(id, font);
      return font;
    }
    return null;
  }

  function families(id) {
    const font = get(id) || byId.get('noto-sans-jp');
    const list = [font.family];
    if (font.jp && byId.has(font.jp)) list.push(byId.get(font.jp).family);
    if (font.user) list.push('Noto Sans JP');
    list.push(font.generic || 'sans-serif');
    return list;
  }

  function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);
  }

  // 指定したテキストの描画に必要なフォントを読み込む
  async function load(id, weight, text) {
    const font = get(id) || byId.get('noto-sans-jp');
    const tasks = [ensureCss(font)];
    if (font.jp && byId.has(font.jp)) tasks.push(ensureCss(byId.get(font.jp)));
    if (font.user) tasks.push(ensureCss(byId.get('noto-sans-jp')));
    await Promise.all(tasks);
    if (!document.fonts || !document.fonts.load) return;
    const fam = root.TextApngEngine ? root.TextApngEngine.cssFontFamily(families(font.id)) : `"${font.family}"`;
    const sample = String(text || '').replace(/\s+/g, '') || 'あA';
    const w = nearestWeight(font, weight);
    try {
      await withTimeout(document.fonts.load(`${w} 48px ${fam}`, sample), 15000);
    } catch (error) {
      // フォントが読めない場合も代替フォントで描画を続ける
    }
  }

  function nearestWeight(font, weight) {
    const weights = (font && font.weights) || [400];
    let best = weights[0];
    weights.forEach(w => { if (Math.abs(w - weight) < Math.abs(best - weight)) best = w; });
    return best;
  }

  async function addFontFile(file) {
    const buffer = await file.arrayBuffer();
    uploadCounter += 1;
    const family = `TAM Upload ${Date.now().toString(36)}${uploadCounter}`;
    const face = new FontFace(family, buffer, { weight: '1 1000', style: 'normal' });
    await face.load();
    document.fonts.add(face);
    const label = file.name.replace(/\.(ttf|otf|woff2?|ttc)$/i, '');
    const id = `upload:${family}`;
    const font = { id, family, weights: [400], cat: 'user', generic: 'sans-serif', user: true, upload: true, label };
    userFonts.set(id, font);
    return font;
  }

  // インストール済みフォントかどうかを文字幅の違いで推定
  function isLocalFontAvailable(name) {
    const clean = String(name || '').trim();
    if (!clean) return false;
    const ctx = document.createElement('canvas').getContext('2d');
    const sample = 'あいう永AaBbWwIi0123';
    return ['monospace', 'serif', 'sans-serif'].some(generic => {
      ctx.font = `48px ${generic}`;
      const base = ctx.measureText(sample).width;
      ctx.font = `48px "${clean.replace(/"/g, '')}", ${generic}`;
      return Math.abs(ctx.measureText(sample).width - base) > 0.5;
    });
  }

  function previewSample(font) {
    return font.cat === 'latin' ? 'Aa Bb 123' : 'あア永 Aa';
  }

  // フォント選択パネル用：フォント名の見本だけを小さなサブセットで取得（別名で登録）
  function loadPreview(font) {
    if (!font || font.user) return Promise.resolve(font ? font.family : null);
    if (previewPromises.has(font.id)) return previewPromises.get(font.id);
    const alias = `TAM Preview ${font.id}`;
    const weight = nearestWeight(font, 700);
    const promise = (async () => {
      try {
        const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family).replace(/%20/g, '+')}${font.weights.length === 1 && font.weights[0] === 400 ? '' : `:wght@${weight}`}&text=${encodeURIComponent(previewSample(font).replace(/\s/g, ''))}`;
        const css = await (await fetch(url)).text();
        const match = /src:\s*url\(([^)]+)\)/.exec(css);
        if (!match) return null;
        const face = new FontFace(alias, `url(${match[1].replace(/['"]/g, '')})`, { weight: String(weight) });
        await face.load();
        document.fonts.add(face);
        return alias;
      } catch (error) {
        return null;
      }
    })();
    previewPromises.set(font.id, promise);
    return promise;
  }

  function list() {
    return CATALOG.concat(Array.from(userFonts.values()).filter(f => f.upload || f.local));
  }

  root.TextApngFonts = {
    CATEGORIES,
    CATALOG,
    get,
    list,
    families,
    load,
    ensureCss,
    nearestWeight,
    addFontFile,
    isLocalFontAvailable,
    loadPreview,
    previewSample
  };
})(window);
