/*
 * 文字画像APNGメーカー — アニメーションWebP エンコーダー
 * ブラウザの WebP 書き出し（canvas.toBlob）で1枚ずつ圧縮し、アニメーションWebP（VP8X + ANIM + ANMF）に組み立てます。
 *  - 前フレームから変化した矩形だけを保存（ブレンドなし・破棄なしで上書き。APNG と同じ考え方）
 *  - 前フレームと同一のフレームは結合して表示時間を延長
 *  - 透明（アルファ）を保持。quality 1 は劣化なし（ロスレス）、1 未満は非可逆圧縮（透明度は劣化なし）
 */
(function (root) {
  'use strict';

  const codec = root.TextApngCodec;
  const { diffRect } = codec._internal;

  function writeAscii(target, offset, text) {
    for (let i = 0; i < text.length; i++) target[offset + i] = text.charCodeAt(i);
  }

  function writeUint16LE(target, offset, value) {
    target[offset] = value & 255;
    target[offset + 1] = (value >>> 8) & 255;
  }

  function writeUint24LE(target, offset, value) {
    target[offset] = value & 255;
    target[offset + 1] = (value >>> 8) & 255;
    target[offset + 2] = (value >>> 16) & 255;
  }

  function writeUint32LE(target, offset, value) {
    writeUint24LE(target, offset, value);
    target[offset + 3] = (value >>> 24) & 255;
  }

  function readUint32LE(bytes, offset) {
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  }

  function concat(parts) {
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    parts.forEach(part => { out.set(part, offset); offset += part.length; });
    return out;
  }

  function makeChunk(name, payload) {
    const out = new Uint8Array(8 + payload.length + (payload.length % 2));
    writeAscii(out, 0, name);
    writeUint32LE(out, 4, payload.length);
    out.set(payload, 8);
    return out;
  }

  // 1枚の WebP ファイルから、アニメーションのフレームに入れる画像のチャンク（ALPH + VP8、または VP8L）だけを取り出す
  function imageChunks(bytes) {
    if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.subarray(8, 12)) !== 'WEBP') {
      throw new Error('Invalid WebP frame.');
    }
    const parts = [];
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const name = String.fromCharCode(...bytes.subarray(offset, offset + 4));
      const size = readUint32LE(bytes, offset + 4);
      const end = offset + 8 + size + (size % 2);
      if (name === 'ALPH' || name === 'VP8 ' || name === 'VP8L') parts.push(bytes.subarray(offset, end));
      offset = end;
    }
    if (!parts.length) throw new Error('No WebP image data.');
    return concat(parts);
  }

  function toBytes(pixels) {
    if (pixels instanceof Uint8Array) return pixels;
    return new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  }

  function view32(bytes) {
    if (bytes.byteOffset % 4 === 0) return new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 2);
    return new Uint32Array(new Uint8Array(bytes).buffer);
  }

  // 入力は RGBA。フレームの表示時間はフレーム数で数え、書き出すときにミリ秒へ直す（端数は全体でずれないように配る）
  class WebpEncoder {
    constructor(options) {
      const { width, height, fps, loops = 0, quality = 0.9 } = options;
      this.width = width;
      this.height = height;
      this.fps = Math.max(1, fps);
      this.loops = Math.max(0, Math.min(65535, Math.round(loops)));
      this.quality = Math.max(0, Math.min(1, quality));
      this.frames = [];
      this.prev = null;
      this.count = 0;
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }

    async _encodeRegion(bytes, rect) {
      const { canvas, ctx } = this;
      if (canvas.width !== rect.w || canvas.height !== rect.h) {
        canvas.width = rect.w;
        canvas.height = rect.h;
      }
      const region = new Uint8ClampedArray(rect.w * rect.h * 4);
      for (let y = 0; y < rect.h; y++) {
        const start = ((rect.y + y) * this.width + rect.x) * 4;
        region.set(bytes.subarray(start, start + rect.w * 4), y * rect.w * 4);
      }
      ctx.putImageData(new ImageData(region, rect.w, rect.h), 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', this.quality));
      if (!blob || blob.type !== 'image/webp') {
        const error = new Error('WebP encoding is not supported.');
        error.code = 'WEBP_UNSUPPORTED';
        throw error;
      }
      return imageChunks(new Uint8Array(await blob.arrayBuffer()));
    }

    async addFrame(pixels) {
      const bytes = toBytes(pixels);
      if (bytes.length !== this.width * this.height * 4) throw new Error('Frame size mismatch.');
      const view = view32(bytes);
      const index = this.count++;
      let rect = { x: 0, y: 0, w: this.width, h: this.height };
      if (this.prev) {
        const changed = diffRect(this.prev, view, this.width, this.height);
        if (!changed) {
          this.frames[this.frames.length - 1].length += 1;
          return false;
        }
        // フレームの位置は偶数でしか指定できないので、左上を偶数にそろえる
        const x = changed.x & ~1;
        const y = changed.y & ~1;
        rect = { x, y, w: changed.x + changed.w - x, h: changed.y + changed.h - y };
      }
      const data = await this._encodeRegion(bytes, rect);
      this.frames.push({ rect, start: index, length: 1, data });
      this.prev = new Uint32Array(view);
      return true;
    }

    get frameCount() {
      return this.frames.length;
    }

    finish() {
      if (!this.frames.length) throw new Error('No frames to encode.');
      const ms = i => Math.round(i * 1000 / this.fps);
      const vp8x = new Uint8Array(10);
      vp8x[0] = 0x12; // アルファあり・アニメーション
      writeUint24LE(vp8x, 4, this.width - 1);
      writeUint24LE(vp8x, 7, this.height - 1);
      const anim = new Uint8Array(6); // 背景色は透明（B, G, R, A = 0）
      writeUint16LE(anim, 4, this.loops);
      const parts = [makeChunk('VP8X', vp8x), makeChunk('ANIM', anim)];
      this.frames.forEach(frame => {
        const header = new Uint8Array(16);
        writeUint24LE(header, 0, frame.rect.x / 2);
        writeUint24LE(header, 3, frame.rect.y / 2);
        writeUint24LE(header, 6, frame.rect.w - 1);
        writeUint24LE(header, 9, frame.rect.h - 1);
        writeUint24LE(header, 12, Math.max(1, ms(frame.start + frame.length) - ms(frame.start)));
        header[15] = 0x02; // ブレンドなし（矩形の中を上書き）・破棄なし
        parts.push(makeChunk('ANMF', concat([header, frame.data])));
      });
      const payload = concat(parts);
      const head = new Uint8Array(12);
      writeAscii(head, 0, 'RIFF');
      writeUint32LE(head, 4, 4 + payload.length);
      writeAscii(head, 8, 'WEBP');
      return new Blob([head, payload], { type: 'image/webp' });
    }
  }

  // このブラウザが WebP を書き出せるか（Safari は canvas の WebP 書き出しに対応していない）
  let supported = null;
  function isWebpSupported() {
    if (supported === null) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        supported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
      } catch (error) {
        supported = false;
      }
    }
    return supported;
  }

  codec.WebpEncoder = WebpEncoder;
  codec.isWebpSupported = isWebpSupported;
})(typeof window !== 'undefined' ? window : globalThis);
