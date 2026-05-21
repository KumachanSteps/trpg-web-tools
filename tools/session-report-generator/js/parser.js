export const SYSTEM_NAMES = {
  call_of_cthulhu: 'Call of Cthulhu', coc: 'CoC', coc6: 'CoC6', coc7: 'CoC7', new_coc: '新クトゥルフ神話TRPG',
  emoklore_en: 'emoklore-trpg', emoklore_ja: 'エモクロアTRPG', madamisu: 'マーダーミステリー',
  shinobigami: 'シノビガミ', insane: 'インセイン', double_cross: 'ダブルクロス The 3rd Edition', sword_world_25: 'ソード・ワールド2.5', futari_sousa: 'フタリソウサ'
};
export function parseSystemName(key) { return SYSTEM_NAMES[key] || key; }
export function getTodayString() { const now = new Date(); return `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}`; }
export function tweetWeightedLength(text) {
  let total = 0;
  for (const ch of Array.from(String(text).normalize('NFC'))) {
    const code = ch.codePointAt(0);
    total += (code <= 0x10FF || (code >= 0x2000 && code <= 0x201F) || (code >= 0x2032 && code <= 0x2037)) ? 1 : 2;
  }
  return total;
}
export function escapeHtml(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
