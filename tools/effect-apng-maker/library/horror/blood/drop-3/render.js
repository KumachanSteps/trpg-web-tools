// 血のしずくが 3 滴、少しずつ時間をずらして画面（ガラス）にぶつかって弾ける（1回再生）。描き方は「1滴」と同じ
import { makeDrops, drawDrops } from '../drop-1/render.js';

export default {
  setup: (P, S) => makeDrops(P, S, 3),
  draw: drawDrops
};
