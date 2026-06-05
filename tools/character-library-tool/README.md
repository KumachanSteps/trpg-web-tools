# キャラリブラ v1.0

## Test flow
1. Open `index.html`.
2. Click `＋ キャラクター追加`.
3. Click `サンプルJSON`, then `読み込み`, then `登録`.
4. The imported CCFOLIA character appears in the gallery using `iconUrl`.
5. Test filter widgets: Status rows, Skill rows, DB +1D4, Current SAN, Sort.

## Files
- `index.html`: gallery and import UI
- `character.html`: detail page
- `character-library.css`: shared CSS
- `character-library.js`: import, parse, filter, sort, render logic
- `data/characters.js`: built-in sample characters

Imported characters are stored in browser localStorage under `characterLibrary.characters.v02`.


## Version Policy

- Current stable version: `v1.0`
- Future updates should increment as:
  - `v1.1`
  - `v1.2`
  - `v1.3`
- Major layout or data-format breaking changes should use:
  - `v2.0`

## Page Title

The web page title is now:

```text
キャラリブラ v1.0
```
