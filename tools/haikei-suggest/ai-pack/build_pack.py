#!/usr/bin/env python3
"""TRPG背景サジェストツール — AI追加パックを作る

パックの中身（このフォルダ構成のまま ZIP にして配布する）:
  manifest.json                     パックの情報と前処理の設定
  ort/ort.wasm.min.js               ONNX Runtime Web（UMD版）
  ort/ort-wasm-simd-threaded.mjs    ONNX Runtime の wasm 読み込み部分
  ort/ort-wasm-simd-threaded.wasm   ONNX Runtime 本体
  model/vision_model.onnx           CLIP の画像側モデル
  tags.json                         タグ文の特徴量（パック作成時に CLIP の文章側モデルで計算）

使い方:
  python3 build_pack.py --out dist            # Hugging Face からモデルを取得して作る
  python3 build_pack.py --model-dir DIR       # 取得済みのモデルを使う（DIR/onnx/*.onnx と DIR/tokenizer.json）
  python3 build_pack.py --dummy --out dist    # 動作確認用の小さなダミーパック（タグは意味を持たない）

必要なもの: python3, numpy, onnxruntime, tokenizers（--dummy は onnx）, npm
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
TOOL = HERE.parent
ORT_VERSION = '1.20.1'
MODEL_REPO = 'Xenova/clip-vit-base-patch32'
MODEL_FILES = {
    'vision': 'onnx/vision_model_quantized.onnx',
    'text': 'onnx/text_model_quantized.onnx',
    'tokenizer': 'tokenizer.json',
}
PACK_ID = 'clip-vit-b32'
PACK_VERSION = '1'
TEMPLATES = [
    'a background illustration of {}.',
    'a photo of {}.',
    'an anime style background of {}.',
    'a scene of {}.',
]

# タグごとの英語の説明（CLIP に渡す文）。色・明るさのタグは色解析で付けるので使わない。
PROMPTS = {
    'in.mansion': ['the interior of an old western mansion', 'a grand manor hall'],
    'in.room': ['a room interior', 'a small private room', 'a cozy wooden room', 'an empty room'],
    'in.bedroom': ['a bedroom with a bed'],
    'in.living': ['a living room with a sofa', 'a parlor'],
    'in.japaneseRoom': ['a traditional japanese tatami room with sliding doors'],
    'in.kitchen': ['a kitchen'],
    'in.bathroom': ['a bathroom', 'a public restroom'],
    'in.hallway': ['a long hallway corridor'],
    'in.stairs': ['an indoor staircase'],
    'in.basement': ['a dark basement cellar'],
    'in.attic': ['an attic under the roof'],
    'in.library': ['a library with bookshelves', 'a study room full of books'],
    'in.school': ['a school classroom with desks', 'a school building interior'],
    'in.hospital': ['a hospital room', 'a hospital corridor'],
    'in.office': ['an office with desks and computers'],
    'in.cafe': ['a cozy cafe interior'],
    'in.bar': ['a bar counter at night', 'a tavern interior'],
    'in.restaurant': ['a restaurant dining room'],
    'in.shop': ['a shop interior with goods on shelves', 'a convenience store'],
    'in.hotel': ['a hotel room', 'a hotel lobby', 'a japanese inn room'],
    'in.apartment': ['an apartment room', 'an apartment building'],
    'in.church': ['a church interior with pews', 'a cathedral'],
    'in.museum': ['a museum gallery with exhibits'],
    'in.lab': ['a science laboratory'],
    'in.prison': ['a prison cell with bars'],
    'in.police': ['a police station'],
    'in.warehouse': ['a warehouse', 'a factory interior'],
    'in.theater': ['a theater stage', 'a concert hall'],
    'in.train': ['the inside of a train car'],
    'in.car': ['the inside of a car', 'the inside of a bus'],
    'in.ship': ['a ship deck', 'the cabin of a ship'],
    'in.castle': ['a castle throne room', 'a palace hall'],
    'in.station': ['a train station platform'],
    'out.city': ['a city street with buildings', 'a downtown cityscape'],
    'out.street': ['a narrow back alley', 'a road'],
    'out.residential': ['a residential neighborhood with houses'],
    'out.park': ['a public park'],
    'out.garden': ['a garden with flowers'],
    'out.forest': ['a forest with trees', 'deep woods'],
    'out.mountain': ['mountains', 'a mountain path'],
    'out.sea': ['the sea', 'a sandy beach'],
    'out.river': ['a river'],
    'out.lake': ['a lake', 'a pond'],
    'out.field': ['a grassy meadow', 'rolling hills'],
    'out.farm': ['rice fields in the countryside', 'a farm'],
    'out.village': ['a rural village'],
    'out.desert': ['a desert with sand dunes'],
    'out.ruins': ['abandoned ruins', 'a derelict abandoned building'],
    'out.graveyard': ['a graveyard with tombstones'],
    'out.shrine': ['a japanese shrine with a torii gate', 'a buddhist temple'],
    'out.rooftop': ['a building rooftop with a fence'],
    'out.bridge': ['a bridge'],
    'out.cave': ['a cave'],
    'out.tunnel': ['a tunnel', 'a sewer tunnel'],
    'out.port': ['a harbor with boats', 'a pier'],
    'out.island': ['an island in the ocean'],
    'out.schoolyard': ['a school ground', 'a school gate'],
    'out.sky': ['the open sky with clouds', 'a starry night sky'],
    'out.space': ['outer space with stars and planets'],
    'out.cliff': ['a cliff by the sea'],
    'time.morning': ['early morning with sunrise light'],
    'time.day': ['a bright daytime scene'],
    'time.evening': ['sunset in the evening', 'dusk with an orange sky'],
    'time.night': ['a night scene', 'nighttime with moonlight'],
    'wx.rain': ['rain falling', 'a rainy day'],
    'wx.snow': ['snow', 'a snowy landscape'],
    'wx.fog': ['thick fog', 'a misty scene'],
    'wx.storm': ['a thunderstorm with lightning'],
    'wx.cloudy': ['an overcast cloudy day'],
    'wx.spring': ['cherry blossoms in spring'],
    'wx.summer': ['a hot summer day'],
    'wx.autumn': ['autumn leaves', 'red and yellow autumn foliage'],
    'wx.winter': ['a cold winter scene'],
    'mood.horror': ['a creepy horror scene', 'a haunted eerie place'],
    'mood.blood': ['blood splatter', 'a gory crime scene with blood'],
    'mood.cosmic': ['an eldritch cosmic horror scene with tentacles'],
    'mood.ritual': ['a ritual altar with candles and a magic circle'],
    'mood.calm': ['a peaceful calm everyday scene'],
    'mood.sad': ['a lonely melancholic scene'],
    'mood.fantasy': ['a dreamlike mystical fantasy scene'],
    'mood.battle': ['a battlefield', 'an intense action scene'],
    'mood.festival': ['a japanese summer festival with lanterns', 'fireworks'],
    'mood.romance': ['a romantic date scene for a couple'],
    'mood.sacred': ['a holy sacred place with heavenly light'],
    'style.japanese': ['traditional japanese architecture'],
    'style.western': ['european gothic architecture'],
    'style.modern': ['modern contemporary japan'],
    'style.retro': ['a retro taisho or showa era japanese scene', 'a vintage 1920s scene'],
    'style.scifi': ['a futuristic sci-fi cyberpunk scene'],
    'style.fantasy': ['a medieval fantasy world'],
    'style.chinese': ['traditional chinese architecture'],
}

# 分類ごとの設定。none は「どれにも当てはまらない」ことを表す文。
GROUPS = [
    {'id': 'place', 'cats': ['indoor', 'outdoor'], 'threshold': 0.2, 'maxTags': 2, 'none': []},
    {'id': 'time', 'cats': ['time'], 'threshold': 0.5, 'maxTags': 1, 'none': ['an indoor room with no window']},
    {'id': 'weather', 'cats': ['weather'], 'threshold': 0.5, 'maxTags': 1,
     'none': ['clear normal weather', 'an indoor room']},
    {'id': 'mood', 'cats': ['mood'], 'threshold': 0.5, 'maxTags': 1, 'none': ['an ordinary scene']},
    {'id': 'style', 'cats': ['style'], 'threshold': 0.6, 'maxTags': 1, 'none': ['a generic scene']},
]


def load_vocab():
    js = (TOOL / 'js' / 'vocab.js').as_posix()
    out = subprocess.run(
        ['node', '-e', f"global.window=global;require({json.dumps(js)});"
                       "process.stdout.write(JSON.stringify(HaikeiVocab.TAGS))"],
        check=True, capture_output=True, text=True)
    return json.loads(out.stdout)


def fetch_model(model_dir: pathlib.Path):
    for rel in MODEL_FILES.values():
        dest = model_dir / rel
        if dest.exists():
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        url = f'https://huggingface.co/{MODEL_REPO}/resolve/main/{rel}'
        print('download', url)
        urllib.request.urlretrieve(url, dest)


def fetch_ort(work: pathlib.Path) -> pathlib.Path:
    subprocess.run(['npm', 'pack', f'onnxruntime-web@{ORT_VERSION}', '--silent'], cwd=work, check=True)
    tgz = next(work.glob('onnxruntime-web-*.tgz'))
    shutil.unpack_archive(str(tgz), str(work))
    return work / 'package' / 'dist'


class TextEncoder:
    def __init__(self, model_dir: pathlib.Path):
        import onnxruntime
        from tokenizers import Tokenizer
        self.tokenizer = Tokenizer.from_file(str(model_dir / MODEL_FILES['tokenizer']))
        self.session = onnxruntime.InferenceSession(str(model_dir / MODEL_FILES['text']))
        self.inputs = [i.name for i in self.session.get_inputs()]
        outputs = [o.name for o in self.session.get_outputs()]
        self.output = 'text_embeds' if 'text_embeds' in outputs else outputs[0]

    def __call__(self, text: str) -> np.ndarray:
        ids = self.tokenizer.encode(text).ids[:77]
        feed = {'input_ids': np.array([ids], dtype=np.int64)}
        if 'attention_mask' in self.inputs:
            feed['attention_mask'] = np.ones((1, len(ids)), dtype=np.int64)
        vec = self.session.run([self.output], feed)[0][0]
        return vec / np.linalg.norm(vec)


def phrase_embedding(encode, phrases):
    vecs = [encode(t.format(p)) for p in phrases for t in TEMPLATES]
    mean = np.mean(vecs, axis=0)
    return mean / np.linalg.norm(mean)


def build_tags(vocab, encode):
    by_cat = {}
    for tag in vocab:
        by_cat.setdefault(tag['cat'], []).append(tag)
    groups = []
    for group in GROUPS:
        tags = []
        for cat in group['cats']:
            for tag in by_cat.get(cat, []):
                phrases = PROMPTS.get(tag['id'], [tag['label']['en'].lower()])
                tags.append({'id': tag['id'], 'emb': round_list(phrase_embedding(encode, phrases))})
        groups.append({
            'id': group['id'],
            'threshold': group['threshold'],
            'maxTags': group['maxTags'],
            'tags': tags,
            'none': [round_list(phrase_embedding(encode, [p])) for p in group['none']],
        })
    return {'logitScale': 100, 'groups': groups}


def round_list(vec):
    return [round(float(x), 5) for x in vec]


def make_dummy_model(path: pathlib.Path, dim=512):
    import onnx
    from onnx import helper, TensorProto, numpy_helper
    rng = np.random.default_rng(1)
    weight = numpy_helper.from_array(rng.standard_normal((3, dim)).astype(np.float32), 'w')
    graph = helper.make_graph(
        [helper.make_node('GlobalAveragePool', ['pixel_values'], ['pooled']),
         helper.make_node('Flatten', ['pooled'], ['flat']),
         helper.make_node('MatMul', ['flat', 'w'], ['image_embeds'])],
        'dummy',
        [helper.make_tensor_value_info('pixel_values', TensorProto.FLOAT, [1, 3, 224, 224])],
        [helper.make_tensor_value_info('image_embeds', TensorProto.FLOAT, [1, dim])],
        [weight])
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 13)])
    model.ir_version = 8
    onnx.save(model, str(path))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--out', default=str(HERE / 'dist'))
    parser.add_argument('--model-dir', help='取得済みのモデル（なければここへダウンロードする）')
    parser.add_argument('--ort-dir', help='onnxruntime-web の dist フォルダ（省略時は npm pack で取得）')
    parser.add_argument('--dummy', action='store_true', help='動作確認用のダミーパックを作る')
    args = parser.parse_args()

    out = pathlib.Path(args.out).resolve()
    name = 'haikei-ai-pack-dummy' if args.dummy else f'haikei-ai-pack-{PACK_ID}-v{PACK_VERSION}'
    pack = out / name
    if pack.exists():
        shutil.rmtree(pack)
    (pack / 'ort').mkdir(parents=True)
    (pack / 'model').mkdir()

    with tempfile.TemporaryDirectory() as tmp:
        ort_dir = pathlib.Path(args.ort_dir) if args.ort_dir else fetch_ort(pathlib.Path(tmp))
        for fname in ['ort.wasm.min.js', 'ort-wasm-simd-threaded.wasm']:
            shutil.copy(ort_dir / fname, pack / 'ort' / fname)
        # ツールは wasm 読み込み部分を blob URL から読み込むが、元のファイルは
        # new URL("ort-wasm-simd-threaded.wasm", import.meta.url) を必ず計算するため、blob URL だと例外になる。
        # wasm 本体はツールが直接渡すのでこの URL は使われない。基準を固定の URL に置き換えておく。
        glue = (ort_dir / 'ort-wasm-simd-threaded.mjs').read_text(encoding='utf-8')
        target = 'new URL("ort-wasm-simd-threaded.wasm",import.meta.url)'
        if glue.count(target) != 1:
            raise SystemExit('onnxruntime-web の wasm 読み込み部分が想定と違います（ORT_VERSION を確認してください）')
        glue = glue.replace(target, 'new URL("ort-wasm-simd-threaded.wasm","https://invalid.local/")')
        (pack / 'ort' / 'ort-wasm-simd-threaded.mjs').write_text(glue, encoding='utf-8')
        if (ort_dir.parent / 'LICENSE').exists():
            shutil.copy(ort_dir.parent / 'LICENSE', pack / 'ort' / 'LICENSE')

        vocab = load_vocab()
        if args.dummy:
            make_dummy_model(pack / 'model' / 'vision_model.onnx')
            rng = np.random.default_rng(2)

            def encode(_text):
                vec = rng.standard_normal(512)
                return vec / np.linalg.norm(vec)
        else:
            model_dir = pathlib.Path(args.model_dir or (pathlib.Path(tmp) / 'model')).resolve()
            fetch_model(model_dir)
            shutil.copy(model_dir / MODEL_FILES['vision'], pack / 'model' / 'vision_model.onnx')
            encode = TextEncoder(model_dir)
        tags = build_tags(vocab, encode)

    (pack / 'tags.json').write_text(json.dumps(tags, separators=(',', ':')), encoding='utf-8')
    manifest = {
        'app': 'haikei-suggest-ai',
        'format': 1,
        'id': 'dummy' if args.dummy else PACK_ID,
        'version': PACK_VERSION,
        'name': 'Dummy pack (test only)' if args.dummy else 'CLIP ViT-B/32 (quantized)',
        'model': 'dummy' if args.dummy else MODEL_REPO,
        'runtime': f'onnxruntime-web {ORT_VERSION}',
        'input': {'name': 'pixel_values', 'size': 224,
                  'mean': [0.48145466, 0.4578275, 0.40821073],
                  'std': [0.26862954, 0.26130258, 0.27577711]},
        'output': 'image_embeds',
        'files': {
            'runtime': 'ort/ort.wasm.min.js',
            'glue': 'ort/ort-wasm-simd-threaded.mjs',
            'wasm': 'ort/ort-wasm-simd-threaded.wasm',
            'model': 'model/vision_model.onnx',
            'tags': 'tags.json',
        },
    }
    (pack / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
    (pack / 'README.txt').write_text(
        'TRPG背景サジェストツール AI追加パック\n'
        'このフォルダを展開したまま、ツールの「AIパック」ボタンからフォルダごと選んでください。\n'
        'Model: OpenAI CLIP ViT-B/32 (MIT License), ONNX conversion by Xenova.\n'
        'Runtime: ONNX Runtime Web (MIT License).\n', encoding='utf-8')

    zip_path = out / (name + '.zip')
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(pack.rglob('*')):
            if file.is_file():
                zf.write(file, file.relative_to(out).as_posix())
    print('pack:', pack)
    print('zip :', zip_path, f'{zip_path.stat().st_size / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
