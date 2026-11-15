import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「風」(wind.js) を描く。mode = strong（強い風）/ storm（暴風）
export default themeAsset({
  file: 'wind',
  opts: (P, S) => ({
    mode: P.mode || 'strong',
    // 暴風の突風は約3秒ごと（長さに合わせて回数を決めると、ループの継ぎ目が出ない）
    ...(P.mode === 'storm' ? { gust: Math.max(1, Math.round(S.duration / 3)) } : {}),
    ...(P.debris ? {} : { leaves: 0, dust: 0, paper: 0, twigs: 0, sand: 0 })
  }),
  mirror: P => P.dir === 'left'
});
