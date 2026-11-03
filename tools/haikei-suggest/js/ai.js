/* TRPG背景サジェストツール — AI追加パック（任意）
 * 別配布のパック（フォルダ）を読み込み、画像の中身からタグを推定する。
 * ・パックの中身: manifest.json / 実行環境（ONNX Runtime Web）/ 画像モデル（ONNX）/ タグの特徴量（tags.json）
 * ・ファイルはすべて File から読み込み、blob URL と ArrayBuffer で渡す。通信はしない。
 * ・タグは「画像の特徴量」と「タグ文の特徴量（パック作成時に計算済み）」の近さで決める。 */
(function (global) {
  'use strict';

  const PACK_APP = 'haikei-suggest-ai';
  const PACK_FORMAT = 1;

  let runtimeLoaded = null;
  let pack = null; // { id, manifest, session, tags, inputName, outputName }

  function readJson(file) {
    return file.text().then((text) => JSON.parse(text));
  }

  // 実行環境（UMD版の ort.wasm.min.js）を blob URL のスクリプトとして読み込む
  function loadRuntime(file) {
    if (runtimeLoaded) return runtimeLoaded;
    runtimeLoaded = new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => (global.ort ? resolve(global.ort) : reject(new Error('runtime missing')));
      script.onerror = () => reject(new Error('runtime load failed'));
      document.head.append(script);
    });
    runtimeLoaded.catch(() => { runtimeLoaded = null; });
    return runtimeLoaded;
  }

  // files: Map<パック内の相対パス, File>
  async function loadPack(files) {
    const manifestFile = files.get('manifest.json');
    if (!manifestFile) throw new Error('manifest.json not found');
    const manifest = await readJson(manifestFile);
    if (manifest.app !== PACK_APP || manifest.format !== PACK_FORMAT) throw new Error('not a pack');
    const need = ['runtime', 'glue', 'wasm', 'model', 'tags'];
    need.forEach((key) => {
      if (!files.get(manifest.files[key])) throw new Error('missing ' + manifest.files[key]);
    });
    const ort = await loadRuntime(files.get(manifest.files.runtime));
    ort.env.wasm.numThreads = 1; // SharedArrayBuffer なしでも動くように
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = { mjs: URL.createObjectURL(files.get(manifest.files.glue)) };
    ort.env.wasm.wasmBinary = await files.get(manifest.files.wasm).arrayBuffer();
    const modelBytes = new Uint8Array(await files.get(manifest.files.model).arrayBuffer());
    const session = await ort.InferenceSession.create(modelBytes, { executionProviders: ['wasm'] });
    const tags = await readJson(files.get(manifest.files.tags));
    pack = {
      id: manifest.id + '@' + manifest.version,
      manifest,
      session,
      tags: prepareTags(tags),
      inputName: manifest.input.name || session.inputNames[0],
      outputName: manifest.output || session.outputNames[0]
    };
    return pack;
  }

  function normalize(vec) {
    let sum = 0;
    for (let i = 0; i < vec.length; i += 1) sum += vec[i] * vec[i];
    const norm = Math.sqrt(sum) || 1;
    const out = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i += 1) out[i] = vec[i] / norm;
    return out;
  }

  function prepareTags(raw) {
    const groups = (raw.groups || []).map((group) => ({
      id: group.id,
      threshold: group.threshold,
      maxTags: group.maxTags || 2,
      tags: group.tags.map((item) => ({ id: item.id, emb: normalize(Float32Array.from(item.emb)) })),
      none: (group.none || []).map((emb) => normalize(Float32Array.from(emb)))
    }));
    return { scale: raw.logitScale || 100, groups };
  }

  // 前処理：背景は画面全体が大事なので、切り抜かずに正方形へ縮小し、平均と標準偏差で正規化する
  function toTensor(source) {
    const input = pack.manifest.input;
    const size = input.size;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const plane = size * size;
    const out = new Float32Array(3 * plane);
    for (let i = 0; i < plane; i += 1) {
      for (let c = 0; c < 3; c += 1) {
        out[c * plane + i] = (data[i * 4 + c] / 255 - input.mean[c]) / input.std[c];
      }
    }
    return new global.ort.Tensor('float32', out, [1, 3, size, size]);
  }

  async function embed(source) {
    if (!pack) throw new Error('no pack');
    const result = await pack.session.run({ [pack.inputName]: toTensor(source) });
    return normalize(result[pack.outputName].data);
  }

  function dot(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
    return sum;
  }

  // 分類ごとに「どのタグに一番近いか」を確率にして、しきい値を超えたタグを付ける。
  // none は「どれにも当てはまらない」を表す文の特徴量で、これが勝てばその分類は付けない。
  function tagsFromEmbedding(emb) {
    if (!pack) return [];
    const vec = emb instanceof Float32Array ? emb : Float32Array.from(emb);
    const found = [];
    pack.tags.groups.forEach((group) => {
      const logits = group.tags.map((tag) => pack.tags.scale * dot(vec, tag.emb));
      const noneLogits = group.none.map((none) => pack.tags.scale * dot(vec, none));
      const all = logits.concat(noneLogits);
      const max = Math.max(...all);
      const exps = all.map((value) => Math.exp(value - max));
      const total = exps.reduce((a, b) => a + b, 0);
      group.tags
        .map((tag, i) => ({ id: tag.id, p: exps[i] / total }))
        .filter((item) => item.p >= group.threshold)
        .sort((a, b) => b.p - a.p)
        .slice(0, group.maxTags)
        .forEach((item) => found.push(item.id));
    });
    return found;
  }

  global.HaikeiAI = {
    loadPack,
    embed,
    tagsFromEmbedding,
    get ready() { return Boolean(pack); },
    get packId() { return pack ? pack.id : null; },
    get packName() { return pack ? pack.manifest.name : ''; }
  };
})(window);
